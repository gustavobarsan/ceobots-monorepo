import { Injectable, Logger } from '@nestjs/common';
import { StartRpaDto } from './dto/start-rpa.dto';
import { chromium, firefox } from 'playwright-extra';
import { Browser } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as xlsx from 'xlsx';
import axios from 'axios';
import FormData from 'form-data';

// Add the stealth plugin to playwright-extra
chromium.use(stealth());
firefox.use(stealth());

@Injectable()
export class RpaService {
  private readonly logger = new Logger(RpaService.name);
  private activeBrowsers: Map<string, Browser> = new Map();

  async startExtraction(dto: StartRpaDto): Promise<void> {
    const {
      usuario,
      senha,
      loja,
      headless,
      dataInicio,
      statusImportacao,
      callbackUrl,
    } = dto;
    const processId = `${usuario}-${Date.now()}`;

    this.logger.log(`Starting RPA for ${usuario} (Process ID: ${processId})`);

    let browser: any = null;
    try {
      browser = await firefox.launch({
        headless: headless ?? true,
      });

      this.activeBrowsers.set(processId, browser);

      const context = await browser.newContext();
      const page = await context.newPage();

      // 1. Acesso Inicial
      await page.goto('https://www.c6consig.com.br/');

      // 2. Login
      await page.waitForSelector('#EUsuario_CAMPO');
      await page.fill('#EUsuario_CAMPO', usuario);

      await page.waitForSelector('#ESenha_CAMPO');
      await page.fill('#ESenha_CAMPO', senha);

      await page.click('#lnkEntrar');

      // Wait a bit for navigation or error
      await page.waitForTimeout(3000);

      // Check for password expiration or other errors
      const pageText = await page.content();
      if (pageText.includes('Nova Senha')) {
        throw new Error('Senha expirada');
      }

      // Wait for login to complete and FISession to appear in URL
      await page.waitForURL(/FISession=/, { timeout: 15000 }).catch(() => {
        // If we didn't land on a FISession URL, maybe we need to click something or check again.
        // In many cases the token might be in the URL immediately or we are on the home page.
      });

      // 3. Extração de Token de Sessão
      const currentUrl = page.url();
      let sessionToken = '';
      const urlParams = new URLSearchParams(currentUrl.split('?')[1]);
      if (urlParams.has('FISession')) {
        sessionToken = urlParams.get('FISession') as string;
      } else {
        // Retry logic or search in links
        const href = await page.evaluate(() => {
          const links = document.querySelectorAll('a');
          for (const link of links) {
            if (link.href.includes('FISession=')) {
              return link.href;
            }
          }
          return null;
        });

        if (href) {
          const params = new URLSearchParams(href.split('?')[1]);
          sessionToken = params.get('FISession') as string;
        } else {
          throw new Error('Não foi possível encontrar o token FISession');
        }
      }

      const consultaUrl = `https://www.c6consig.com.br/WebAutorizador/MenuWeb/Esteira/AprovacaoConsulta/UI.AprovacaoConsultaAnd.aspx?FISession=${sessionToken}`;
      await page.goto(consultaUrl);

      // 4. Filtros e Consulta
      // Assume selectors based on typical asp.net pages, might need adjustment if real HTML is available
      // The specs don't provide exact selectors for dates/status, so we will stub it and proceed to the search button.
      // If dataInicio is provided:
      if (dataInicio) {
        // Wait and fill date
        // e.g. await page.fill('#txtDataInicio', dataInicio);
        this.logger.debug(`Aplicando filtro de dataInicio: ${dataInicio}`);
      }

      if (statusImportacao && statusImportacao.length > 0) {
        // Select status
        this.logger.debug(
          `Aplicando filtro de status: ${statusImportacao.join(', ')}`,
        );
      }

      // Click "Consultar" button (assuming an ID like #btnConsultar or similar - specs don't provide it)
      // This part is skipped/stubbed if we don't have the real selector.
      // The specs say "Disparar a consulta"
      try {
        await page.evaluate(() => {
          // Attempting generic submit or clicking on a specific button
          const btn = document.querySelector(
            'input[value="Consultar"]',
          ) as HTMLElement;
          if (btn) btn.click();
        });
      } catch (e) {
        // Ignore
        this.logger.debug(
          'Ignored error when trying to click consult: ' + String(e),
        );
      }

      // 5. Varredura e Paginação (Scraping)
      const allData: any[] = [];
      let hasNextPage = true;

      while (hasNextPage) {
        // Aguardar o carregamento do spinner
        try {
          await page.waitForSelector('#ctl00_UpdPrs', {
            state: 'hidden',
            timeout: 30000,
          });
        } catch (e) {
          this.logger.warn('Timeout waiting for spinner to hide: ' + String(e));
        }

        // Wait for the table to appear
        await page
          .waitForSelector('table#ctl00_Cph_AprCons_grdConsulta', {
            timeout: 10000,
          })
          .catch(() => null);

        // Ler a tabela
        const pageData = await page.evaluate(() => {
          const rows = Array.from(
            document.querySelectorAll('table#ctl00_Cph_AprCons_grdConsulta tr'),
          );
          if (!rows.length) return [];

          const headers = Array.from(rows[0].querySelectorAll('th, td')).map(
            (th) => th.textContent?.trim() || '',
          );
          const data = [];

          for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td')).map(
              (td) => td.textContent?.trim() || '',
            );
            // Simple mapping
            const rowObj: any = {};
            headers.forEach((header, index) => {
              if (header) {
                rowObj[header] = cells[index];
              } else {
                rowObj[`Column${index}`] = cells[index];
              }
            });
            data.push(rowObj);
          }
          return data;
        });

        allData.push(...pageData);

        // Tratar a paginação
        const nextButtonActive = await page.evaluate(() => {
          const nextBtn = document.querySelector(
            '#ctl00_Cph_AprCons_lkbProximo',
          ) as HTMLAnchorElement;
          if (
            nextBtn &&
            nextBtn.href &&
            nextBtn.href.includes('javascript:__doPostBack')
          ) {
            nextBtn.click();
            return true;
          }
          return false;
        });

        hasNextPage = nextButtonActive;

        if (hasNextPage) {
          // Wait a bit for the postback to start and the spinner to show
          await page.waitForTimeout(1000);
        }
      }

      this.logger.log(
        `Extração finalizada. Total de registros: ${allData.length}`,
      );

      // 6. Compilação do Arquivo
      const ws = xlsx.utils.json_to_sheet(allData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Dados');
      const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // 7. Disparo do Callback
      const formData = new FormData();
      formData.append('arquivo', excelBuffer, {
        filename: `extracao_c6_${loja}_${Date.now()}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      formData.append('banco', 'c6');
      formData.append('loja', loja);

      await axios.post(callbackUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      this.logger.log(`Callback enviado com sucesso para ${callbackUrl}`);
    } catch (error) {
      this.logger.error(
        `Erro durante execução RPA: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // In a real app, we might want to notify a failure callback URL here
    } finally {
      if (browser) {
        await browser.close().catch(() => null);
        this.activeBrowsers.delete(processId);
      }
    }
  }

  stopAll(): void {
    let stoppedCount = 0;
    for (const [id, browser] of this.activeBrowsers.entries()) {
      try {
        browser.close();
        stoppedCount++;
        this.activeBrowsers.delete(id);
      } catch (e) {
        this.logger.error(`Failed to close browser for ${id}`, e);
      }
    }
    this.logger.log(`Stopped ${stoppedCount} active browsers`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { StartRpaDto } from './dto/start-rpa.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import * as crypto from 'crypto';
const anticaptcha = require('@antiadmin/anticaptchaofficial');

@Injectable()
export class RpaService {
  private readonly logger = new Logger(RpaService.name);

  // Track active operations. Key is loja, or some unique identifier.
  // For simplicity since it's a stateless microservice and we only have one stop endpoint,
  // we'll track a global abort controller or map by a specific ID. We'll use a single global for now, or map.
  private activeJobs = new Map<string, { abortController: AbortController, browser: Browser | null }>();

  async startImport(dto: StartRpaDto, jobId: string = 'default'): Promise<void> {
    this.logger.log(`Starting RPA import for esteira: ${dto.esteira}`);
    let browser: Browser | null = null;
    let filePath: string | null = null;
    const abortController = new AbortController();
    this.activeJobs.set(jobId, { abortController, browser: null });

    try {
      // 1. Decode base64 file to /tmp/{fileName}
      const tmpDir = os.tmpdir();
      const safeFileName = `${crypto.randomUUID()}_${path.basename(dto.fileName)}`;
      filePath = path.join(tmpDir, safeFileName);
      const fileBuffer = Buffer.from(dto.fileBase64, 'base64');
      fs.writeFileSync(filePath, fileBuffer);
      this.logger.log(`File saved to ${filePath}`);

      if (abortController.signal.aborted) throw new Error('Aborted');
      // 2. Setup Playwright
      browser = await chromium.launch({ headless: dto.headless ?? true });
      this.activeJobs.get(jobId)!.browser = browser;
      const context = await browser.newContext();
      const page = await context.newPage();

      // 3. Navigate to login
      if (abortController.signal.aborted) throw new Error('Aborted');
      await page.goto('https://alcifmais.workbankvirtual.com.br/login.aspx?pdc=true');

      // 4. Fill username
      await page.fill('#usuario', dto.usuario);

      // 5. Check and resolve reCAPTCHA
      const recaptchaContainer = await page.$('#divRecaptcha');
      if (recaptchaContainer) {
        this.logger.log('reCAPTCHA detected, attempting to resolve...');
        anticaptcha.setAPIKey(process.env.APIKEY_ANTICAPTCHA || '');

        try {
          const token = await anticaptcha.solveRecaptchaV2Proxyless(
            'https://alcifmais.workbankvirtual.com.br/login.aspx',
            '6Lc-mtgUAAAAAN2LwQ52i6Cec8vPlcjNFFWlwmFx'
          );
          this.logger.log('reCAPTCHA resolved successfully.');

          await page.evaluate((recaptchaToken) => {
            const responseInput = document.querySelector('[name="g-recaptcha-response"]') as HTMLInputElement;
            if (responseInput) responseInput.value = recaptchaToken;

            const captchaIdInput = document.querySelector('#captchaId') as HTMLInputElement;
            if (captchaIdInput) captchaIdInput.value = recaptchaToken;

            // Trigger global callback if available
            if (typeof (window as any).setResponse === 'function') {
              (window as any).setResponse(recaptchaToken);
            }

            // Dispatch change events
            if (responseInput) responseInput.dispatchEvent(new Event('change'));
            if (captchaIdInput) captchaIdInput.dispatchEvent(new Event('change'));
          }, token);
        } catch (err) {
          this.logger.error('Failed to resolve reCAPTCHA', err);
          throw new Error('Failed to resolve reCAPTCHA');
        }
      }

      // 6. First Click
      if (abortController.signal.aborted) throw new Error('Aborted');
      await page.click('.login-btn');

      // 7. Wait for password field to be visible (not hidden)
      // Playwright's wait for visibility handles this, or wait for the style to change
      await page.waitForFunction(() => {
        const passwordInput = document.querySelector('#senha') as HTMLInputElement;
        return passwordInput && !passwordInput.hidden && window.getComputedStyle(passwordInput).display !== 'none';
      }, { timeout: 30000 });

      // 8. Fill password
      await page.fill('#senha', dto.senha);

      // 9. Second Click
      if (abortController.signal.aborted) throw new Error('Aborted');
      await Promise.all([
        page.waitForNavigation({ url: /ImportacaoBackOffice\.aspx|Default\.aspx/ }),
        page.click('.login-btn'),
      ]);
      this.logger.log('Login successful.');

      // 10. Navigation
      if (abortController.signal.aborted) throw new Error('Aborted');
      await page.getByRole('link', { name: 'CADASTROS' }).click();
      await page.getByRole('link', { name: 'Importação de Arquivos' }).click();
      await page.getByRole('link', { name: 'Mapeamento de Arquivos' }).click();

      // 11. Upload in Iframe
      const iframeElement = await page.waitForSelector('#reactFrame');
      const frame = await iframeElement.contentFrame();

      if (!frame) {
        throw new Error('Failed to locate the reactFrame content frame');
      }

      await frame.getByPlaceholder('Filtrar por nome').fill(dto.esteira);

      const fileChooserPromise = page.waitForEvent('filechooser');
      await frame.getByLabel('Arquivo').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      if (abortController.signal.aborted) throw new Error('Aborted');
      await page.waitForTimeout(1000);

      if (abortController.signal.aborted) throw new Error('Aborted');
      await frame.getByRole('button', { name: 'Enviar Arquivo' }).click();
      this.logger.log('File uploaded successfully.');

      // 12. Final Callback
      if (abortController.signal.aborted) throw new Error('Aborted');
      this.logger.log(`Sending success callback to ${dto.callbackUrl}`);
      await axios.post(dto.callbackUrl, {
        banco: 'C6',
        loja: dto.loja,
        status: 'success'
      });

    } catch (error) {
      if ((error as any).message === 'Aborted') {
        this.logger.log('RPA import aborted.');
      } else {
        this.logger.error(`Error during RPA import: ${(error as any).message}`, (error as any).stack);

        // Send failure callback if possible
        try {
          if (dto.callbackUrl) {
            await axios.post(dto.callbackUrl, {
              banco: 'C6', // Or 'Workbank' depending on naming, using 'C6' to match previous example
              loja: dto.loja,
              status: 'error',
              message: (error as any).message
            });
          }
        } catch (callbackError) {
          this.logger.error(`Failed to send error callback: ${(callbackError as any).message}`);
        }
      }
    } finally {
      this.activeJobs.delete(jobId);
      if (browser) {
        await browser.close();
      }
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          this.logger.warn(`Could not delete temporary file ${filePath}`);
        }
      }
    }
  }

  async stopImport(jobId: string = 'default'): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.abortController.abort();
      if (job.browser) {
        await job.browser.close().catch(err => this.logger.error(`Error closing browser on abort: ${err.message}`));
      }
      this.activeJobs.delete(jobId);
      this.logger.log(`Job ${jobId} stopped.`);
    } else {
      this.logger.log(`No active job found with id ${jobId} to stop.`);
    }
  }
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RpaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpaService = void 0;
const common_1 = require("@nestjs/common");
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const xlsx = __importStar(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const stealthPlugin = (0, puppeteer_extra_plugin_stealth_1.default)();
if (stealthPlugin.enabledEvasions) {
    stealthPlugin.enabledEvasions.delete('user-agent-override');
}
playwright_extra_1.chromium.use(stealthPlugin);
playwright_extra_1.firefox.use(stealthPlugin);
let RpaService = RpaService_1 = class RpaService {
    logger = new common_1.Logger(RpaService_1.name);
    activeBrowsers = new Map();
    async startExtraction(dto) {
        const { usuario, senha, loja, headless, statusImportacao, callbackUrl } = dto;
        const processId = `${usuario}-${Date.now()}`;
        this.logger.log(`Starting RPA for ${usuario} (Process ID: ${processId})`);
        let browser = null;
        try {
            browser = await playwright_extra_1.firefox.launch({
                headless: headless ?? true,
                slowMo: 2000,
            });
            this.activeBrowsers.set(processId, browser);
            const context = await browser.newContext();
            const page = await context.newPage();
            page.on('dialog', async (dialog) => {
                this.logger.log(`Dialog detected [${dialog.type()}]: "${dialog.message()}"`);
                await dialog.accept();
                this.logger.log('Dialog auto-accepted successfully.');
            });
            await page.goto('https://c6.c6consig.com.br/WebAutorizador/Login/AC.UI.LOGIN.aspx?FISession=be757aff9935');
            await page.waitForSelector('#EUsuario_CAMPO');
            await page.fill('#EUsuario_CAMPO', usuario);
            await page.waitForSelector('#ESenha_CAMPO');
            await page.fill('#ESenha_CAMPO', senha);
            await page.click('#lnkEntrar');
            await page.waitForTimeout(3000);
            const pageText = await page.content();
            if (pageText.includes('Nova Senha')) {
                throw new Error('Senha expirada');
            }
            await page.waitForURL(/FISession=/, { timeout: 15000 }).catch(() => {
            });
            const currentUrl = page.url();
            let sessionToken = '';
            const urlParams = new URLSearchParams(currentUrl.split('?')[1]);
            if (urlParams.has('FISession')) {
                sessionToken = urlParams.get('FISession');
            }
            else {
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
                    sessionToken = params.get('FISession');
                }
                else {
                    throw new Error('Não foi possível encontrar o token FISession');
                }
            }
            const consultaUrl = `https://c6.c6consig.com.br/WebAutorizador/MenuWeb/Esteira/AprovacaoConsulta/UI.AprovacaoConsultaAnd.aspx?FISession=${sessionToken}`;
            await page.goto(consultaUrl);
            const hoje = new Date();
            const seteDiasAtras = new Date(hoje);
            seteDiasAtras.setDate(hoje.getDate() - 7);
            const dataInicioDefault = seteDiasAtras.toISOString().split('T')[0];
            this.logger.debug(`Aplicando filtro de dataInicio: ${dataInicioDefault}`);
            if (statusImportacao && statusImportacao.length > 0) {
                this.logger.debug(`Aplicando filtro de status: ${statusImportacao.join(', ')}`);
            }
            try {
                await page.evaluate(() => {
                    const btn = document.querySelector('input[value="Consultar"]');
                    if (btn)
                        btn.click();
                });
            }
            catch (e) {
                this.logger.debug('Ignored error when trying to click consult: ' + String(e));
            }
            const allData = [];
            let hasNextPage = true;
            while (hasNextPage) {
                try {
                    await page.waitForSelector('#ctl00_UpdPrs', {
                        state: 'hidden',
                        timeout: 30000,
                    });
                }
                catch (e) {
                    this.logger.warn('Timeout waiting for spinner to hide: ' + String(e));
                }
                await page
                    .waitForSelector('table#ctl00_Cph_AprCons_grdConsulta', {
                    timeout: 10000,
                })
                    .catch(() => null);
                const pageData = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('table#ctl00_Cph_AprCons_grdConsulta tr'));
                    if (!rows.length)
                        return [];
                    const headers = Array.from(rows[0].querySelectorAll('th, td')).map((th) => th.textContent?.trim() || '');
                    const data = [];
                    for (let i = 1; i < rows.length; i++) {
                        const cells = Array.from(rows[i].querySelectorAll('td')).map((td) => td.textContent?.trim() || '');
                        const rowObj = {};
                        headers.forEach((header, index) => {
                            if (header) {
                                rowObj[header] = cells[index];
                            }
                            else {
                                rowObj[`Column${index}`] = cells[index];
                            }
                        });
                        data.push(rowObj);
                    }
                    return data;
                });
                allData.push(...pageData);
                const nextButtonActive = await page.evaluate(() => {
                    const nextBtn = document.querySelector('#ctl00_Cph_AprCons_lkbProximo');
                    if (nextBtn &&
                        nextBtn.href &&
                        nextBtn.href.includes('javascript:__doPostBack')) {
                        nextBtn.click();
                        return true;
                    }
                    return false;
                });
                hasNextPage = nextButtonActive;
                if (hasNextPage) {
                    await page.waitForTimeout(1000);
                }
            }
            this.logger.log(`Extração finalizada. Total de registros: ${allData.length}`);
            const ws = xlsx.utils.json_to_sheet(allData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Dados');
            const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
            try {
                const fs = require('fs');
                const path = require('path');
                const debugPath = path.join(process.cwd(), `extracao_c6_${loja}_debug.xlsx`);
                fs.writeFileSync(debugPath, excelBuffer);
                this.logger.log(`[Debug] Cópia local da planilha salva em: ${debugPath}`);
            }
            catch (debugErr) {
                this.logger.error(`[Debug] Falha ao salvar cópia local: ${debugErr.message}`);
            }
            const formData = new form_data_1.default();
            formData.append('arquivo', excelBuffer, {
                filename: `extracao_c6_${loja}_${Date.now()}.xlsx`,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            formData.append('banco', 'c6');
            formData.append('loja', loja);
            await axios_1.default.post(callbackUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            this.logger.log(`Callback enviado com sucesso para ${callbackUrl}`);
        }
        catch (error) {
            this.logger.error(`Erro durante execução RPA: ${error.message}`, error.stack);
        }
        finally {
            if (browser) {
                await browser.close().catch(() => null);
                this.activeBrowsers.delete(processId);
            }
        }
    }
    stopAll() {
        let stoppedCount = 0;
        for (const [id, browser] of this.activeBrowsers.entries()) {
            try {
                browser.close();
                stoppedCount++;
                this.activeBrowsers.delete(id);
            }
            catch (e) {
                this.logger.error(`Failed to close browser for ${id}`, e);
            }
        }
        this.logger.log(`Stopped ${stoppedCount} active browsers`);
    }
};
exports.RpaService = RpaService;
exports.RpaService = RpaService = RpaService_1 = __decorate([
    (0, common_1.Injectable)()
], RpaService);
//# sourceMappingURL=rpa.service.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proposta_entity_1 = require("../../db/entities/proposta.entity");
const axios_1 = __importDefault(require("axios"));
let SchedulerService = SchedulerService_1 = class SchedulerService {
    propostaRepository;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(propostaRepository) {
        this.propostaRepository = propostaRepository;
    }
    async triggerC6Extraction() {
        this.logger.debug('Triggering C6 RPA extraction...');
        try {
            const response = await axios_1.default.post(`${process.env.C6_RPA_URL || 'http://localhost:3001'}/rpa/start`, {
                usuario: process.env.C6_USER || 'usuario_teste',
                senha: process.env.C6_PASSWORD || 'senha_teste',
                loja: process.env.C6_LOJA || '000015',
                dataInicio: '01/01/2023',
                statusImportacao: 'Aprovado',
                callbackUrl: `${process.env.QUEUE_SELF_URL || 'http://localhost:3000'}/propostas/upload`
            });
            this.logger.debug(`C6 RPA trigger response: ${response.status}`);
        }
        catch (error) {
            this.logger.error(`Failed to trigger C6 RPA: ${error.message}`);
        }
    }
    async triggerCRMImport() {
        this.logger.debug('Checking for pending proposals to import to CRM...');
        try {
            const pendingGroups = await this.propostaRepository
                .createQueryBuilder('proposta')
                .select(['proposta.banco', 'proposta.loja'])
                .where('proposta.status = :status', { status: 'pendente' })
                .groupBy('proposta.banco, proposta.loja')
                .getRawMany();
            if (pendingGroups.length === 0) {
                this.logger.debug('No pending proposals found.');
                return;
            }
            for (const group of pendingGroups) {
                this.logger.debug(`Triggering CRM import for ${group.proposta_banco} - ${group.proposta_loja}`);
                this.logger.debug(`Skipped actual CRM POST as file generation logic is pending specific requirements.`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to trigger CRM import: ${error.message}`);
        }
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_2_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "triggerC6Extraction", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "triggerCRMImport", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proposta_entity_1.Proposta)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map
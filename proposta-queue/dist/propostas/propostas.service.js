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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropostasService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proposta_entity_1 = require("../db/entities/proposta.entity");
let PropostasService = class PropostasService {
    propostaQueue;
    propostaRepository;
    constructor(propostaQueue, propostaRepository) {
        this.propostaQueue = propostaQueue;
        this.propostaRepository = propostaRepository;
    }
    async handleFileUpload(arquivo, banco, loja) {
        if (!arquivo) {
            throw new Error('Arquivo não enviado');
        }
        const jobData = {
            caminho: arquivo.path,
            nomeOriginal: arquivo.originalname,
            banco: banco.toLowerCase(),
            loja,
        };
        await this.propostaQueue.add('process-file', jobData);
        return {
            message: 'Arquivo recebido e enfileirado para processamento',
            jobData,
        };
    }
    async confirmImport(banco, loja, status) {
        if (status === 'success') {
            const updateResult = await this.propostaRepository
                .createQueryBuilder()
                .update(proposta_entity_1.Proposta)
                .set({ status: 'importado' })
                .where('banco = :banco', { banco: banco.toLowerCase() })
                .andWhere('loja = :loja', { loja })
                .andWhere('status = :status', { status: 'pendente' })
                .execute();
            return {
                message: `Importação confirmada para o banco ${banco} e loja ${loja}`,
                recordsUpdated: updateResult.affected,
            };
        }
        return {
            message: 'Status não é success, nenhuma atualização feita.',
        };
    }
};
exports.PropostasService = PropostasService;
exports.PropostasService = PropostasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('proposta')),
    __param(1, (0, typeorm_1.InjectRepository)(proposta_entity_1.Proposta)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        typeorm_2.Repository])
], PropostasService);
//# sourceMappingURL=propostas.service.js.map
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropostaProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proposta_entity_1 = require("../../db/entities/proposta.entity");
const xlsx = __importStar(require("xlsx"));
const c6_mapper_1 = require("../mappers/c6.mapper");
const fs = __importStar(require("fs"));
let PropostaProcessor = class PropostaProcessor extends bullmq_1.WorkerHost {
    propostaRepository;
    c6Mapper = new c6_mapper_1.C6Mapper();
    constructor(propostaRepository) {
        super();
        this.propostaRepository = propostaRepository;
    }
    async process(job) {
        const { caminho, banco, loja } = job.data;
        try {
            const workbook = xlsx.readFile(caminho);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet);
            const propostas = rows.map((row) => {
                let partial;
                if (banco === 'c6') {
                    partial = this.c6Mapper.mapRow(row);
                }
                else {
                    partial = {
                        cliente: row['cliente'] || 'Desconhecido',
                        valor: row['valor'] || 0,
                        produto: row['produto'] || 'Consignado',
                        status: 'pendente',
                        dadosOriginais: row,
                    };
                }
                return this.propostaRepository.create({
                    ...partial,
                    banco,
                    loja,
                });
            });
            if (propostas.length > 0) {
                await this.propostaRepository.save(propostas);
            }
            if (fs.existsSync(caminho)) {
                fs.unlinkSync(caminho);
            }
            return { success: true, count: propostas.length };
        }
        catch (error) {
            console.error(`Error processing file ${caminho}:`, error);
            throw error;
        }
    }
};
exports.PropostaProcessor = PropostaProcessor;
exports.PropostaProcessor = PropostaProcessor = __decorate([
    (0, bullmq_1.Processor)('proposta', {
        concurrency: 5,
    }),
    __param(0, (0, typeorm_1.InjectRepository)(proposta_entity_1.Proposta)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropostaProcessor);
//# sourceMappingURL=proposta.processor.js.map
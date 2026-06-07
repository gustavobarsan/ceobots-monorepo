import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Proposta } from '../db/entities/proposta.entity';
export declare class PropostasService {
    private propostaQueue;
    private propostaRepository;
    constructor(propostaQueue: Queue, propostaRepository: Repository<Proposta>);
    handleFileUpload(arquivo: Express.Multer.File, banco: string, loja: string): Promise<{
        message: string;
        jobData: {
            caminho: string;
            nomeOriginal: string;
            banco: string;
            loja: string;
        };
    }>;
    confirmImport(banco: string, loja: string, status: string): Promise<{
        message: string;
        recordsUpdated: number | undefined;
    } | {
        message: string;
        recordsUpdated?: undefined;
    }>;
}

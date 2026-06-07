import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Proposta } from '../../db/entities/proposta.entity';
interface FileProcessingJob {
    caminho: string;
    nomeOriginal: string;
    banco: 'c6';
    loja: string;
}
export declare class PropostaProcessor extends WorkerHost {
    private readonly propostaRepository;
    private c6Mapper;
    constructor(propostaRepository: Repository<Proposta>);
    process(job: Job<FileProcessingJob, any, string>): Promise<any>;
}
export {};

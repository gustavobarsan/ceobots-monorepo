import { Repository } from 'typeorm';
import { Proposta } from '../../db/entities/proposta.entity';
export declare class SchedulerService {
    private readonly propostaRepository;
    private readonly logger;
    constructor(propostaRepository: Repository<Proposta>);
    triggerC6Extraction(): Promise<void>;
    triggerCRMImport(): Promise<void>;
}

import { PropostaMapper } from './proposta.mapper';
import { Proposta } from '../../db/entities/proposta.entity';
export declare class C6Mapper implements PropostaMapper {
    mapRow(row: Record<string, any>): Partial<Proposta>;
}

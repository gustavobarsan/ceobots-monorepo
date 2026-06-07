import { Proposta } from '../../db/entities/proposta.entity';
export interface PropostaMapper {
    mapRow(row: Record<string, unknown>): Partial<Proposta>;
}

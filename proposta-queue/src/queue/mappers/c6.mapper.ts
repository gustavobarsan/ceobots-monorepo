import { PropostaMapper } from './proposta.mapper';
import { Proposta } from '../../db/entities/proposta.entity';

export class C6Mapper implements PropostaMapper {
  mapRow(row: Record<string, any>): Partial<Proposta> {
    const cliente = row['Cliente'] || row['Nome'] || row['Nome do Cliente'] || '';
    const valorRaw = row['Valor'] || row['Vl. Operação'] || row['Vl. Contrato'] || '';

    let valor = 0;
    if (typeof valorRaw === 'number') {
      valor = valorRaw;
    } else if (typeof valorRaw === 'string') {
      const cleaned = valorRaw.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        valor = parsed;
      }
    }

    const produto = row['Operação'] || row['Produto'] || 'Consignado';

    return {
      cliente: cliente.toString(),
      valor,
      produto: produto.toString(),
      status: 'pendente',
      dadosOriginais: row,
    };
  }
}

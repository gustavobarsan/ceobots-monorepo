import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposta } from '../../db/entities/proposta.entity';
import * as xlsx from 'xlsx';
import { C6Mapper } from '../mappers/c6.mapper';
import * as fs from 'fs';

interface FileProcessingJob {
  caminho: string;
  nomeOriginal: string;
  banco: 'c6';
  loja: string;
}

@Processor('proposta', {
  concurrency: 5,
})
export class PropostaProcessor extends WorkerHost {
  private c6Mapper = new C6Mapper();

  constructor(
    @InjectRepository(Proposta)
    private readonly propostaRepository: Repository<Proposta>,
  ) {
    super();
  }

  async process(job: Job<FileProcessingJob, any, string>): Promise<any> {
    const { caminho, banco, loja } = job.data;

    try {
      const workbook = xlsx.readFile(caminho);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);

      const propostas = rows.map((row: any) => {
        let partial: Partial<Proposta>;
        if (banco === 'c6') {
          partial = this.c6Mapper.mapRow(row);
        } else {
          // Default mapping
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

      // Cleanup
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }

      return { success: true, count: propostas.length };
    } catch (error) {
      console.error(`Error processing file ${caminho}:`, error);
      throw error;
    }
  }
}

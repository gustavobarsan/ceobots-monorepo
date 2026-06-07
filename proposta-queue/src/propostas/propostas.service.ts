import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposta } from '../db/entities/proposta.entity';

@Injectable()
export class PropostasService {
  constructor(
    @InjectQueue('proposta') private propostaQueue: Queue,
    @InjectRepository(Proposta) private propostaRepository: Repository<Proposta>,
  ) {}

  async handleFileUpload(arquivo: Express.Multer.File, banco: string, loja: string) {
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

  async confirmImport(banco: string, loja: string, status: string) {
    if (status === 'success') {
      const updateResult = await this.propostaRepository
        .createQueryBuilder()
        .update(Proposta)
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
}

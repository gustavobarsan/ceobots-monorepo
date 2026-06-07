import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposta } from '../../db/entities/proposta.entity';
import axios from 'axios';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Proposta)
    private readonly propostaRepository: Repository<Proposta>,
  ) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async triggerC6Extraction() {
    this.logger.debug('Triggering C6 RPA extraction...');

    try {
      const response = await axios.post(`${process.env.C6_RPA_URL || 'http://localhost:3001'}/rpa/start`, {
        usuario: process.env.C6_USER || 'usuario_teste',
        senha: process.env.C6_PASSWORD || 'senha_teste',
        loja: process.env.C6_LOJA || '000015',
        dataInicio: '01/01/2023',
        statusImportacao: 'Aprovado',
        callbackUrl: `${process.env.QUEUE_SELF_URL || 'http://localhost:3000'}/propostas/upload`
      });

      this.logger.debug(`C6 RPA trigger response: ${response.status}`);
    } catch (error) {
      this.logger.error(`Failed to trigger C6 RPA: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async triggerCRMImport() {
    this.logger.debug('Checking for pending proposals to import to CRM...');

    try {
      // Find distinct banks/lojas that have pending proposals
      const pendingGroups = await this.propostaRepository
        .createQueryBuilder('proposta')
        .select(['proposta.banco', 'proposta.loja'])
        .where('proposta.status = :status', { status: 'pendente' })
        .groupBy('proposta.banco, proposta.loja')
        .getRawMany();

      if (pendingGroups.length === 0) {
        this.logger.debug('No pending proposals found.');
        return;
      }

      for (const group of pendingGroups) {
        this.logger.debug(`Triggering CRM import for ${group.proposta_banco} - ${group.proposta_loja}`);

        // This is a placeholder since the actual CRM import expects a fileBase64
        // In a real scenario, we would generate a new excel file with all pending records
        // and send it to the CRM RPA.

        // Simulating the call for now
        /*
        await axios.post(`${process.env.CRM_RPA_URL || 'http://localhost:3002'}/rpa/start`, {
          usuario: process.env.CRM_USER || 'crm_user',
          senha: process.env.CRM_PASSWORD || 'crm_pwd',
          loja: group.proposta_loja,
          fileBase64: 'base64_encoded_file_here',
          fileName: `export_${group.proposta_banco}_${group.proposta_loja}.xlsx`,
          esteira: 'C6 BANK',
          callbackUrl: `${process.env.QUEUE_SELF_URL || 'http://localhost:3000'}/propostas/confirmar-importacao`
        });
        */
        this.logger.debug(`Skipped actual CRM POST as file generation logic is pending specific requirements.`);
      }

    } catch (error) {
      this.logger.error(`Failed to trigger CRM import: ${error.message}`);
    }
  }
}

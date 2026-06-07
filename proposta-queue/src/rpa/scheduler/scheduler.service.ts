import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposta } from '../../db/entities/proposta.entity';
import axios from 'axios';
import * as xlsx from 'xlsx';

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
        dataInicio: '2023-01-01',
        statusImportacao: ['Aprovado'],
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

        // Fetch the actual records for this group
        const records = await this.propostaRepository.find({
          where: {
            banco: group.proposta_banco,
            loja: group.proposta_loja,
            status: 'pendente'
          }
        });

        if (records.length === 0) continue;

        // Extract the original data to form the spreadsheet
        const rowData = records.map(r => r.dadosOriginais || {
          Cliente: r.cliente,
          Valor: r.valor,
          Produto: r.produto
        });

        // Convert the data back to an excel file in memory
        const worksheet = xlsx.utils.json_to_sheet(rowData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Propostas');

        // Write it to buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const fileBase64 = buffer.toString('base64');

        const fileName = `export_${group.proposta_banco}_${group.proposta_loja}_${Date.now()}.xlsx`;

        // Use 'C6 BANK' as esteira if banco is c6, otherwise uppercase banco
        const esteira = group.proposta_banco.toLowerCase() === 'c6' ? 'C6 BANK' : group.proposta_banco.toUpperCase();

        await axios.post(`${process.env.CRM_RPA_URL || 'http://localhost:3002'}/rpa/start`, {
          usuario: process.env.CRM_USER || 'crm_user',
          senha: process.env.CRM_PASSWORD || 'crm_pwd',
          loja: group.proposta_loja,
          fileBase64: fileBase64,
          fileName: fileName,
          esteira: esteira,
          callbackUrl: `${process.env.QUEUE_SELF_URL || 'http://localhost:3000'}/propostas/confirmar-importacao`
        });

        this.logger.debug(`CRM RPA POST triggered for ${fileName}`);
      }

    } catch (error) {
      this.logger.error(`Failed to trigger CRM import: ${error.message}`);
    }
  }
}

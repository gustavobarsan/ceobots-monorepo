import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PropostaProcessor } from './processors/proposta.processor';
import { DbModule } from '../db/db.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'proposta',
    }),
    DbModule,
  ],
  providers: [PropostaProcessor],
  exports: [BullModule],
})
export class QueueModule {}

import { Module } from '@nestjs/common';
import { PropostasService } from './propostas.service';
import { PropostasController } from './propostas.controller';
import { DbModule } from '../db/db.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DbModule, QueueModule],
  providers: [PropostasService],
  controllers: [PropostasController],
  exports: [PropostasService]
})
export class PropostasModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropostasModule } from './propostas/propostas.module';
import { RpaModule } from './rpa/rpa.module';
import { DbModule } from './db/db.module';
import { QueueModule } from './queue/queue.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DbModule,
    QueueModule,
    PropostasModule,
    RpaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

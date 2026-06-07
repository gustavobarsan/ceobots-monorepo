import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler/scheduler.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [SchedulerService],
})
export class RpaModule {}

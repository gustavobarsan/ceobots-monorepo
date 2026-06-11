import { Module } from '@nestjs/common';
import { RpaController } from './rpa.controller';
import { RpaService } from './rpa.service';

@Module({
  controllers: [RpaController],
  providers: [RpaService],
})
export class RpaModule {}

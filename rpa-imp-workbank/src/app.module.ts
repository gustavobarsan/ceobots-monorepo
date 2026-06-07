import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RpaController } from './rpa/rpa.controller';
import { RpaService } from './rpa/rpa.service';

@Module({
  imports: [],
  controllers: [AppController, RpaController],
  providers: [AppService, RpaService],
})
export class AppModule {}

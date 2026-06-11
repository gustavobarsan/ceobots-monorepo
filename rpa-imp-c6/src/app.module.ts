import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RpaModule } from './rpa/rpa.module';

@Module({
  imports: [RpaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

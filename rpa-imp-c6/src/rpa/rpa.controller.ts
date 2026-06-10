import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RpaService } from './rpa.service';
import { StartRpaDto } from './dto/start-rpa.dto';

@Controller('rpa')
export class RpaController {
  constructor(private readonly rpaService: RpaService) {}

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  start(@Body() startRpaDto: StartRpaDto) {
    // Start extraction in background
    this.rpaService.startExtraction(startRpaDto).catch(() => {
      // Errors are already logged in the service
    });

    return {
      status: 'running',
      message: 'C6 RPA pipeline started successfully in background',
    };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop() {
    this.rpaService.stopAll();

    return {
      status: 'stopped',
      message: 'C6 RPA processing was aborted by request',
    };
  }
}

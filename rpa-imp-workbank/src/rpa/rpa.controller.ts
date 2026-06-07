import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { RpaService } from './rpa.service';
import { StartRpaDto } from './dto/start-rpa.dto';

@Controller('rpa')
export class RpaController {
  constructor(private readonly rpaService: RpaService) {}

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stopRpa() {
    await this.rpaService.stopImport();
    return {
      status: 'stopped',
      message: 'Workbank RPA processing was aborted by request'
    };
  }

  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  async startRpa(@Body() startRpaDto: StartRpaDto) {
    // Validate required fields basic
    const required = ['usuario', 'senha', 'fileBase64', 'fileName', 'esteira', 'callbackUrl'];
    for (const field of required) {
      if (!startRpaDto[field as keyof StartRpaDto]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    // Fire and forget, trigger the import process in the background
    this.rpaService.startImport(startRpaDto).catch(err => {
      // The service already logs errors, but we can catch any uncaught here
      console.error('Unhandled error in background RPA task:', err);
    });

    return {
      status: 'accepted',
      message: 'RPA import started successfully in background'
    };
  }
}

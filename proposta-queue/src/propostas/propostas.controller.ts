import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PropostasService } from './propostas.service';
import * as path from 'path';

@Controller('propostas')
export class PropostasController {
  constructor(private readonly propostasService: PropostasService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: diskStorage({
        destination: '/tmp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('banco') banco: string,
    @Body('loja') loja: string,
  ) {
    return this.propostasService.handleFileUpload(arquivo, banco, loja);
  }

  @Post('confirmar-importacao')
  async confirmarImportacao(
    @Body('banco') banco: string,
    @Body('loja') loja: string,
    @Body('status') status: string,
    @Body('message') message: string,
  ) {
    return this.propostasService.confirmImport(banco, loja, status);
  }
}

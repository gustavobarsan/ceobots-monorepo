import { PropostasService } from './propostas.service';
export declare class PropostasController {
    private readonly propostasService;
    constructor(propostasService: PropostasService);
    uploadFile(arquivo: Express.Multer.File, banco: string, loja: string): Promise<{
        message: string;
        jobData: {
            caminho: string;
            nomeOriginal: string;
            banco: string;
            loja: string;
        };
    }>;
    confirmarImportacao(banco: string, loja: string, status: string, message: string): Promise<{
        message: string;
        recordsUpdated: number | undefined;
    } | {
        message: string;
        recordsUpdated?: undefined;
    }>;
}

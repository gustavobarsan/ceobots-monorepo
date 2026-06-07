import { StartRpaDto } from './dto/start-rpa.dto';
export declare class RpaService {
    private readonly logger;
    private activeBrowsers;
    startExtraction(dto: StartRpaDto): Promise<void>;
    stopAll(): void;
}

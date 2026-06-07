import { RpaService } from './rpa.service';
import { StartRpaDto } from './dto/start-rpa.dto';
export declare class RpaController {
    private readonly rpaService;
    constructor(rpaService: RpaService);
    start(startRpaDto: StartRpaDto): {
        status: string;
        message: string;
    };
    stop(): {
        status: string;
        message: string;
    };
}

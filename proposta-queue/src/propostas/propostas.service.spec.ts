import { Test, TestingModule } from '@nestjs/testing';
import { PropostasService } from './propostas.service';

describe('PropostasService', () => {
  let service: PropostasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropostasService],
    }).compile();

    service = module.get<PropostasService>(PropostasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

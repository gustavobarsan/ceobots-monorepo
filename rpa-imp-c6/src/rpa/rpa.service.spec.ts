import { Test, TestingModule } from '@nestjs/testing';
import { RpaService } from './rpa.service';

describe('RpaService', () => {
  let service: RpaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RpaService],
    }).compile();

    service = module.get<RpaService>(RpaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

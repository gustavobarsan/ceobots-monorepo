import { Test, TestingModule } from '@nestjs/testing';
import { RpaController } from './rpa.controller';
import { RpaService } from './rpa.service';

describe('RpaController', () => {
  let controller: RpaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RpaController],
      providers: [
        {
          provide: RpaService,
          useValue: {
            startExtraction: jest.fn(),
            stopAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RpaController>(RpaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

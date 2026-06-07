import { Test, TestingModule } from '@nestjs/testing';
import { PropostasController } from './propostas.controller';

describe('PropostasController', () => {
  let controller: PropostasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropostasController],
    }).compile();

    controller = module.get<PropostasController>(PropostasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

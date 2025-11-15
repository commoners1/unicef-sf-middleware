import { Test, TestingModule } from '@nestjs/testing';
import { SalesforceController } from './salesforce.controller';
import { SalesforceService } from './salesforce-queue.service';

describe('SalesforceController', () => {
  let controller: SalesforceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesforceController],
      providers: [SalesforceService],
    }).compile();

    controller = module.get<SalesforceController>(SalesforceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

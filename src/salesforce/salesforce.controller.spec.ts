import { Test, TestingModule } from '@nestjs/testing';
import { SalesforceController } from './salesforce.controller';
import { SalesforceService } from './salesforce.service';
import { AuditService } from '../audit/audit.service';
import { ApiKeyGuard } from '../api-key/guards/api-key.guard';

describe('SalesforceController', () => {
  let controller: SalesforceController;
  let service: SalesforceService;
  let auditService: AuditService;

  const mockSalesforceService = {
    getToken: jest.fn(),
    directApi: jest.fn(),
    paymentApi: jest.fn(),
  };

  const mockAuditService = {
    logApiCall: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesforceController],
      providers: [
        {
          provide: SalesforceService,
          useValue: mockSalesforceService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: ApiKeyGuard,
          useValue: {
            canActivate: jest.fn(() => true),
          },
        },
      ],
    }).compile();

    controller = module.get<SalesforceController>(SalesforceController);
    service = module.get<SalesforceService>(SalesforceService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getToken', () => {
    it('should return token from service', async () => {
      const mockToken = {
        access_token: 'test-token',
        instance_url: 'https://test.salesforce.com',
      };
      mockSalesforceService.getToken.mockResolvedValue(mockToken);

      const result = await controller.getToken({
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test' },
      } as any);

      expect(result).toEqual(mockToken);
      expect(mockSalesforceService.getToken).toHaveBeenCalled();
    });
  });
});

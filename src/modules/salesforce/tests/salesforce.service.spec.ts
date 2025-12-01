import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infra/database/prisma.service';
import { SalesforceConfigService } from '@core/config/salesforce-config.service';
import { SalesforceService } from '@modules/salesforce/services/salesforce.service';
import { AuditService } from '@modules/audit/services/audit.service';

describe('SalesforceService', () => {
  let service: SalesforceService;

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockPrisma = {
    salesforce: {
      findFirst: jest.fn(),
    },
  };

  const mockAuditService = {
    logApiCall: jest.fn(),
  };

  const mockSalesforceConfig = {
    getEndpoints: jest.fn(() => ({
      BASE_URL: 'https://test.salesforce.com',
      TOKEN_URL: 'https://test.salesforce.com/services/oauth2/token',
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesforceService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: SalesforceConfigService,
          useValue: mockSalesforceConfig,
        },
      ],
    }).compile();

    service = module.get<SalesforceService>(SalesforceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with endpoints from config', () => {
    expect(mockSalesforceConfig.getEndpoints).toHaveBeenCalled();
  });
});

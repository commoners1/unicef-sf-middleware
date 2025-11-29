import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SalesforceService } from './salesforce.service';
import { PrismaService } from '@infra/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SalesforceConfigService } from '@core/services/salesforce-config.service';

describe('SalesforceService', () => {
  let service: SalesforceService;
  let configService: ConfigService;
  let prisma: PrismaService;
  let auditService: AuditService;
  let salesforceConfig: SalesforceConfigService;

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
    configService = module.get<ConfigService>(ConfigService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    salesforceConfig = module.get<SalesforceConfigService>(SalesforceConfigService);
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

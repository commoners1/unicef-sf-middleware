import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiKeyService } from './api-key.service';
import { PrismaService } from '@infra/prisma.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    getOrThrow: jest.fn(() => 'test-encryption-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateApiKey', () => {
    it('should return invalid if API key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid-key', 'development');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid API key');
    });

    it('should return invalid if API key is inactive', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        id: '1',
        key: 'test-key',
        isActive: false,
        user: { isActive: true },
      });

      const result = await service.validateApiKey('test-key', 'development');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('API key is inactive');
    });

    it('should return valid for active API key', async () => {
      const mockApiKey = {
        id: '1',
        key: 'test-key',
        name: 'Test Key',
        isActive: true,
        permissions: ['read', 'write'],
        environment: 'development',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          company: 'Test Company',
          role: 'USER',
          isActive: true,
        },
      };

      mockPrisma.apiKey.findFirst.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey('test-key', 'development');

      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.apiKey).toBeDefined();
    });
  });
});


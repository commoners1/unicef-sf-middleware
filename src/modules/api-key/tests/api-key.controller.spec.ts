import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from '../api-key.controller';
import { ApiKeyService } from '../services/api-key.service';
import { AuthModule } from '../../auth/auth.module';
import { JwtAuthGuard } from '../../auth/jwt/jwt-auth.guard';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let service: ApiKeyService;

  const mockApiKeyService = {
    createUser: jest.fn(),
    createApiKey: jest.fn(),
    getAllApiKeys: jest.fn(),
    getApiKeyById: jest.fn(),
    updateApiKey: jest.fn(),
    deleteApiKey: jest.fn(),
    validateApiKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
      ],
      imports: [AuthModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    service = module.get<ApiKeyService>(ApiKeyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        company: 'Test Company',
      };

      const mockUser = {
        id: '1',
        email: createUserDto.email,
        name: createUserDto.name,
      };

      mockApiKeyService.createUser.mockResolvedValue(mockUser);

      const result = await controller.createApiKey(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockApiKeyService.createUser).toHaveBeenCalledWith(
        createUserDto.email,
        createUserDto.name,
        createUserDto.password,
        createUserDto.company,
      );
    });
  });

  describe('createApiKey', () => {
    it('should create an API key', async () => {
      const createApiKeyDto = {
        userId: '1',
        name: 'Test API Key',
        description: 'Test description',
        permissions: ['read', 'write'],
        environment: 'development',
      };

      const mockApiKey = {
        id: '1',
        key: 'test-api-key',
        name: createApiKeyDto.name,
      };

      mockApiKeyService.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(createApiKeyDto);

      expect(result).toEqual(mockApiKey);
      expect(mockApiKeyService.createApiKey).toHaveBeenCalledWith(
        createApiKeyDto.userId,
        createApiKeyDto.name,
        createApiKeyDto.description,
        createApiKeyDto.permissions,
        createApiKeyDto.environment,
      );
    });
  });
});

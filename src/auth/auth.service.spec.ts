import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenService } from './services/token.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let tokenService: TokenService;

  const mockUserService = {
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockTokenService = {
    generateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => 'test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
      };

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.validatePassword.mockResolvedValue(true);
      mockTokenService.generateToken.mockResolvedValue('test-token');

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw error for invalid credentials', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrong-password'),
      ).rejects.toThrow();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsService } from './errors.service';
import { PrismaService } from '@infra/prisma.service';

describe('ErrorsService', () => {
  let service: ErrorsService;
  let prisma: PrismaService;

  const mockPrisma = {
    errorLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ErrorsService>(ErrorsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllErrors', () => {
    it('should return paginated errors', async () => {
      const mockErrors = [
        {
          id: '1',
          message: 'Test error',
          type: 'error',
        },
      ];

      mockPrisma.errorLog.findMany.mockResolvedValue(mockErrors);
      mockPrisma.errorLog.findMany.mockResolvedValueOnce(mockErrors).mockResolvedValueOnce([{ _count: { id: 1 } }]);

      const result = await service.getAllErrors(1, 10, {});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(mockPrisma.errorLog.findMany).toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should create error log entry', async () => {
      const errorData = {
        message: 'Test error',
        type: 'error',
        source: 'test',
        environment: 'development',
      };

      const mockError = {
        id: '1',
        ...errorData,
      };

      mockPrisma.errorLog.create.mockResolvedValue(mockError);

      const result = await service.logError(errorData);

      expect(result).toEqual(mockError);
      expect(mockPrisma.errorLog.create).toHaveBeenCalled();
    });
  });
});


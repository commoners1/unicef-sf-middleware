import { Test, TestingModule } from '@nestjs/testing';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

describe('ErrorsController', () => {
  let controller: ErrorsController;
  let service: ErrorsService;

  const mockErrorsService = {
    getAllErrors: jest.fn(),
    getErrorById: jest.fn(),
    resolveError: jest.fn(),
    bulkDelete: jest.fn(),
    getErrorTrends: jest.fn(),
    exportErrors: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorsController],
      providers: [
        {
          provide: ErrorsService,
          useValue: mockErrorsService,
        },
      ],
      imports: [AuthModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ErrorsController>(ErrorsController);
    service = module.get<ErrorsService>(ErrorsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      mockErrorsService.getAllErrors.mockResolvedValue({
        data: mockErrors,
        total: 1,
        page: 1,
        limit: 10,
      });

      const result = await controller.getAllErrors(1, 10, {});

      expect(result.data).toEqual(mockErrors);
      expect(mockErrorsService.getAllErrors).toHaveBeenCalled();
    });
  });

  describe('getErrorById', () => {
    it('should return error by id', async () => {
      const mockError = {
        id: '1',
        message: 'Test error',
      };

      mockErrorsService.getErrorById.mockResolvedValue(mockError);

      const result = await controller.getErrorById('1');

      expect(result).toEqual(mockError);
      expect(mockErrorsService.getErrorById).toHaveBeenCalledWith('1');
    });
  });

  describe('resolveError', () => {
    it('should resolve an error', async () => {
      const resolveDto = {
        resolvedBy: 'user-id',
      };

      mockErrorsService.resolveError.mockResolvedValue({
        id: '1',
        resolved: true,
      });

      const result = await controller.resolveError('1', resolveDto);

      expect(result.resolved).toBe(true);
      expect(mockErrorsService.resolveError).toHaveBeenCalledWith('1', resolveDto.resolvedBy);
    });
  });
});


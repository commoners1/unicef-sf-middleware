import { Test, TestingModule } from '@nestjs/testing';
import { CronJobsController } from './cron-jobs.controller';
import { CronJobsService } from './cron-jobs.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

describe('CronJobsController', () => {
  let controller: CronJobsController;
  let service: CronJobsService;

  const mockCronJobsService = {
    getCronJobs: jest.fn(),
    getCronJobStats: jest.fn(),
    getCronJobById: jest.fn(),
    createCronJob: jest.fn(),
    updateCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
    executeCronJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CronJobsController],
      providers: [
        {
          provide: CronJobsService,
          useValue: mockCronJobsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CronJobsController>(CronJobsController);
    service = module.get<CronJobsService>(CronJobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCronJobs', () => {
    it('should return paginated cron jobs', async () => {
      const mockCronJobs = {
        data: [{ id: '1', name: 'Test Job' }],
        total: 1,
        page: 1,
        limit: 50,
      };

      mockCronJobsService.getCronJobs.mockResolvedValue(mockCronJobs);

      const result = await controller.getCronJobs(
        { user: { id: '1' } } as any,
        1,
        50,
      );

      expect(result).toEqual(mockCronJobs);
      expect(mockCronJobsService.getCronJobs).toHaveBeenCalled();
    });
  });

  describe('getCronJobStats', () => {
    it('should return cron job statistics', async () => {
      const mockStats = {
        total: 10,
        active: 5,
        inactive: 5,
      };

      mockCronJobsService.getCronJobStats.mockResolvedValue(mockStats);

      const result = await controller.getCronJobStats({ user: { id: '1' } } as any);

      expect(result).toEqual(mockStats);
      expect(mockCronJobsService.getCronJobStats).toHaveBeenCalled();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { CronJobsService } from './cron-jobs.service';
import { PrismaService } from '@infra/prisma.service';
import { QueueService } from '../queue/services/queue.service';

describe('CronJobsService', () => {
  let service: CronJobsService;
  let prisma: PrismaService;
  let queueService: QueueService;

  const mockPrisma = {
    cronJob: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockQueueService = {
    addSalesforceJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronJobsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<CronJobsService>(CronJobsService);
    prisma = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCronJobs', () => {
    it('should return paginated cron jobs', async () => {
      const mockCronJobs = [{ id: '1', name: 'Test Job' }];
      mockPrisma.cronJob.findMany.mockResolvedValue(mockCronJobs);
      mockPrisma.cronJob.count.mockResolvedValue(1);

      const result = await service.getCronJobs({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(mockPrisma.cronJob.findMany).toHaveBeenCalled();
    });
  });

  describe('getCronJobStats', () => {
    it('should return cron job statistics', async () => {
      mockPrisma.cronJob.count.mockResolvedValue(10);
      mockPrisma.cronJob.findMany.mockResolvedValue([
        { isActive: true },
        { isActive: false },
      ]);

      const result = await service.getCronJobStats();

      expect(result).toHaveProperty('total');
      expect(mockPrisma.cronJob.count).toHaveBeenCalled();
    });
  });
});


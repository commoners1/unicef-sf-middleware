import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '@modules/queue/services/queue.service';

describe('QueueService', () => {
  let service: QueueService;

  const mockSalesforceQueue = {
    add: jest.fn(),
    getJobCounts: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
    getJobCounts: jest.fn(),
  };

  const mockNotificationsQueue = {
    add: jest.fn(),
    getJobCounts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('salesforce'),
          useValue: mockSalesforceQueue,
        },
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addSalesforceJob', () => {
    it('should add a Salesforce job to the queue', async () => {
      const jobData = {
        endpoint: '/test',
        payload: { test: 'data' },
        token: 'test-token',
        type: 'POST',
        clientId: 'client-1',
        auditId: 'audit-1',
      };

      const mockJob = { id: 'job-1', data: jobData };
      mockSalesforceQueue.add.mockResolvedValue(mockJob);

      const result = await service.addSalesforceJob(jobData);

      expect(result).toEqual(mockJob);
      expect(mockSalesforceQueue.add).toHaveBeenCalledWith(
        'process-salesforce',
        jobData,
        expect.objectContaining({
          priority: 0,
          delay: 0,
        }),
      );
    });

    it('should use custom job options when provided', async () => {
      const jobData = {
        endpoint: '/test',
        payload: {},
        token: 'test-token',
        type: 'GET',
        clientId: 'client-1',
        auditId: 'audit-1',
      };

      const options = {
        priority: 10,
        delay: 1000,
        attempts: 3,
      };

      mockSalesforceQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.addSalesforceJob(jobData, options);

      expect(mockSalesforceQueue.add).toHaveBeenCalledWith(
        'process-salesforce',
        jobData,
        expect.objectContaining({
          priority: 10,
          delay: 1000,
          attempts: 3,
        }),
      );
    });
  });

  describe('addEmailJob', () => {
    it('should add an email job to the queue', async () => {
      const jobData = {
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      const mockJob = { id: 'email-1', data: jobData };
      mockEmailQueue.add.mockResolvedValue(mockJob);

      const result = await service.addEmailJob(jobData);

      expect(result).toEqual(mockJob);
      expect(mockEmailQueue.add).toHaveBeenCalled();
    });
  });

  describe('addNotificationJob', () => {
    it('should add a notification job to the queue', async () => {
      const jobData = {
        type: 'push',
        message: 'Test notification',
        userId: 'user-1',
      };

      const mockJob = { id: 'notif-1', data: jobData };
      mockNotificationsQueue.add.mockResolvedValue(mockJob);

      const result = await service.addNotificationJob(jobData);

      expect(result).toEqual(mockJob);
      expect(mockNotificationsQueue.add).toHaveBeenCalled();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      };

      mockSalesforceQueue.getJobCounts.mockResolvedValue(mockStats);
      mockEmailQueue.getJobCounts.mockResolvedValue(mockStats);
      mockNotificationsQueue.getJobCounts.mockResolvedValue(mockStats);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        salesforce: mockStats,
        email: mockStats,
        notifications: mockStats,
      });
    });
  });
});

import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);

  constructor(
    @InjectQueue('salesforce') private salesforceQueue: Queue,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async getQueueHealth() {
    try {
      const [salesforce, email, notifications] = await Promise.all([
        this.salesforceQueue.getJobCounts(),
        this.emailQueue.getJobCounts(),
        this.notificationsQueue.getJobCounts(),
      ]);

      return {
        status: 'healthy',
        queues: {
          salesforce: {
            ...salesforce,
            health: this.calculateHealth(salesforce),
          },
          email: {
            ...email,
            health: this.calculateHealth(email),
          },
          notifications: {
            ...notifications,
            health: this.calculateHealth(notifications),
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get queue health:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getQueueMetrics() {
    const [salesforce, email, notifications] = await Promise.all([
      this.salesforceQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
      this.notificationsQueue.getJobCounts(),
    ]);

    return {
      salesforce,
      email,
      notifications,
      total: {
        waiting: salesforce.waiting + email.waiting + notifications.waiting,
        active: salesforce.active + email.active + notifications.active,
        completed:
          salesforce.completed + email.completed + notifications.completed,
        failed: salesforce.failed + email.failed + notifications.failed,
      },
    };
  }

  async getQueueStats() {
    return this.getQueueMetrics();
  }

  private calculateHealth(counts: any): string {
    const total =
      counts.waiting + counts.active + counts.completed + counts.failed;
    const failureRate = total > 0 ? counts.failed / total : 0;

    if (failureRate > 0.5) return 'critical';
    if (failureRate > 0.2) return 'warning';
    return 'healthy';
  }
}

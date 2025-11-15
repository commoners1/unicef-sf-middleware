// src/queue/jobs/notification.job.ts
export interface NotificationJobData {
  type: 'push' | 'sms' | 'email' | 'webhook';
  userId: string;
  message: string;
  data?: any;
}

export interface NotificationJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
}

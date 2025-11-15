// src/types/queue.types.ts
import { Job } from 'bullmq';

export interface SalesforceJobData {
  endpoint: string;
  payload: Record<string, unknown> | null;
  token: string;
  type: string;
  clientId: string;
  auditId: string;
  userId?: string;
  apiKeyId?: string;
  timestamp?: Date;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
  userId?: string;
  apiKeyId?: string;
}

export interface NotificationJobData {
  type: string;
  message?: string;
  timestamp?: Date;
  userId?: string;
  apiKeyId?: string;
  data?: Record<string, unknown>;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export type SalesforceJob = Job<SalesforceJobData>;
export type EmailJob = Job<EmailJobData>;
export type NotificationJob = Job<NotificationJobData>;

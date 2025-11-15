// src/queue/jobs/salesforce.job.ts
export interface SalesforceJobData {
  endpoint: string;
  payload: any;
  token: string;
  auditId: string;
  userId: string;
}

export interface SalesforceJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

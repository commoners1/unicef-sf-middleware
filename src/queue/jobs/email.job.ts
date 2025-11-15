// src/queue/jobs/email.job.ts
export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  template?: string;
  userId: string;
}

export interface EmailJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
}

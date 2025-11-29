// Note: SALESFORCE_ENDPOINTS has been moved to SalesforceConfigService
// Use SalesforceConfigService (injectable) instead of importing from here
// This ensures proper environment variable validation via ConfigService

// High-performance queue configuration for 450k jobs/day
export const HIGH_VOLUME_CONFIG = {
  BATCH_SIZE: 100,
  BATCH_TIMEOUT: 5000, // 5 seconds
  MAX_CONCURRENCY: 20,
  MAX_ATTEMPTS: 2,
  RETRY_DELAY: 500,
  STALLED_INTERVAL: 10000,
  MAX_STALLED_COUNT: 1,

  // Performance thresholds
  ALERTS: {
    QUEUE_DEPTH: 5000,
    ERROR_RATE: 0.05,
    PROCESSING_TIME: 10000,
    MEMORY_USAGE: 0.8,
    JOBS_PER_SECOND: 50,
  },

  // Database optimization
  DATABASE: {
    BATCH_SIZE: 100,
    CONNECTION_POOL: 20,
    QUERY_TIMEOUT: 30000,
    VACUUM_INTERVAL: 3600000, // 1 hour
  },

  // Redis optimization
  REDIS: {
    MAX_CONNECTIONS: 20,
    MIN_CONNECTIONS: 5,
    CONNECT_TIMEOUT: 10000,
    COMMAND_TIMEOUT: 5000,
    RETRY_DELAY: 50,
    MAX_RETRIES: 3,
  },
} as const;

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
  DEVELOPMENT: {
    CONCURRENCY: 5,
    BATCH_SIZE: 50,
    REMOVE_ON_COMPLETE: 100,
    REMOVE_ON_FAIL: 50,
  },
  STAGING: {
    CONCURRENCY: 10,
    BATCH_SIZE: 75,
    REMOVE_ON_COMPLETE: 500,
    REMOVE_ON_FAIL: 250,
  },
  PRODUCTION: {
    CONCURRENCY: 20,
    BATCH_SIZE: 100,
    REMOVE_ON_COMPLETE: 5000,
    REMOVE_ON_FAIL: 2000,
  },
} as const;

// Salesforce audit log methods
export const SALESFORCE_METHODS = [
  'callPledgeChargeApi',
  'callPledgeApi',
  'callOneOffApi',
  'callXenditPaymentLinkApi',
] as const;

export const CRON_JOB_METHODS = ['callPledge', 'callOneoff'] as const;

export type SalesforceMethod = typeof SALESFORCE_METHODS[number];
export type CronJobMethod = typeof CRON_JOB_METHODS[number];
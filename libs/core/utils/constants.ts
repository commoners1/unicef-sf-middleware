import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();
const BASE_URL = configService.getOrThrow<string>('SF_BASE_ENDPOINT');

// Salesforce Endpoints
export const SALESFORCE_ENDPOINTS = {
  BASE_URL,
  ENDPOINTS: {
    PLEDGE: `${BASE_URL}/core/pledge/v2.0/`,
    PLEDGE_CHARGE: `${BASE_URL}/core/pledgewcharge/v2.0/`,
    ONEOFF: `${BASE_URL}/core/oneoff/v2.0/`,
    XENDIT_PAYMENT_LINK: `${BASE_URL}/idn/v2.0/xendit/`,
    PLEDGE_API: `/core/pledge/v2.0/`,
    PLEDGE_CHARGE_API: `/core/pledgewcharge/v2.0/`,
    ONEOFF_API: `/core/oneoff/v2.0/`,
    XENDIT_PAYMENT_LINK_API: `/idn/v2.0/xendit/`,
  },
  TYPES: {
    PLEDGE_TYPES: {
      POST_MONTHLY_SEND: 'post-monthly-send',
      POST_MONTHLY: 'post-monthly',
      PLEDGE: 'pledge',
    },
    PLEDGE_CHARGE: {
      CHARGE_SEND: 'charge-send',
      CHARGE: 'charge',
    },
    ONEOFF_TYPES: {
      POST_ONEOFF_SEND: 'post-oneoff-send',
      POST_ONEOFF: 'post-oneoff',
      ONEOFF: 'oneoff',
    },
    XENDIT_PAYMENT_LINK: {
      PAYMENT_LINK_SEND: 'payment-link-send',
      PAYMENT_LINK: 'payment-link',
    },
  },
} as const;

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

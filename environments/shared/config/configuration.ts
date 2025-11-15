// environments/shared/config/configuration.ts
export default () => ({
  // Application
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'sfapi',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-encryption-key-change-in-production',
  },
  
  // Salesforce API
  salesforce: {
    baseEndpoint: process.env.SF_BASE_ENDPOINT,
    clientId: process.env.SF_CLIENT_ID,
    clientSecret: process.env.SF_CLIENT_SECRET,
    resourceApi: process.env.SF_RESOURCE_API,
    tokenUrl: process.env.SF_TOKEN_URL,
    subscriptionKey: process.env.SF_SUBSCRIPTION_KEY,
    subscriptionPaymentKey: process.env.SF_SUBSCRIPTION_PAYMENT_KEY,
  },
  
  // Queue Configuration
  queue: {
    name: process.env.QUEUE_NAME || 'sf-queue',
    salesforceConcurrency: parseInt(process.env.SALESFORCE_CONCURRENCY || '5', 10),
    emailConcurrency: parseInt(process.env.EMAIL_CONCURRENCY || '5', 10),
    notificationConcurrency: parseInt(process.env.NOTIFICATION_CONCURRENCY || '5', 10),
  },
  
  // Rate Limiting
  rateLimit: {
    highVolume: {
      windowMs: 60 * 1000, // 1 minute
      max: parseInt(process.env.HIGH_VOLUME_RATE_LIMIT || '1000', 10),
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10),
    },
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-request-type',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
  
  // Monitoring
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    },
  },
});

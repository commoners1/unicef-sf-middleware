import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import { getLiveSettings } from './settings/settings.service';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@infra/prisma.service';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './errors/filters/http-exception.filter';
import { ErrorsService } from './errors/errors.service';
import { CsrfMiddleware } from './auth/middleware/csrf.middleware';

function decodeJwtPayload(token: string): any {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const isAdmin = (req: Request): boolean => {
  // Try to get token from cookie first, then fall back to Authorization header for backward compatibility
  const token = req.cookies?.auth_token || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return false;
  try {
    const payload = decodeJwtPayload(token);
    return payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure cookie parser for httpOnly cookies
  app.use(cookieParser());

  // CSRF protection middleware - must be after cookie parser
  const csrfMiddleware = app.get(CsrfMiddleware);
  app.use(csrfMiddleware.use.bind(csrfMiddleware));

  // Configure request size limits for security
  app.use((req: Request, res: Response, next: NextFunction) => {
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length'], 10);
      if (contentLength > maxSize) {
        return res.status(413).json({
          statusCode: 413,
          message: 'Request entity too large',
          error: 'Payload Too Large',
        });
      }
    }
    next();
  });

  // Global validation pipe with security best practices
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide detailed errors in production
      validationError: {
        target: false, // Don't expose the target object
        value: false, // Don't expose the value that failed validation
      },
    }),
  );

  // Configure trust proxy securely for proper handling behind proxies/load balancers
  // Only trust 1 proxy hop in production, disable in development
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust only 1 proxy hop
  } else {
    app.set('trust proxy', false); // Disable in development
  }

  // Configure CORS with security best practices
  // When credentials: true, origin cannot be '*', must be specific origins
  const getCorsOrigins = (): string | string[] => {
    if (process.env.CORS_ORIGIN) {
      // Support comma-separated origins
      const origins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      return origins.length === 1 ? origins[0] : origins;
    }
    // Default for development: allow frontend on port 3001
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:3000'];
    }
    // Production/staging should always set CORS_ORIGIN explicitly
    throw new Error('CORS_ORIGIN environment variable must be set in production/staging');
  };

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true, // Allow cookies/credentials
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-request-type',
      'X-CSRF-Token',
    ], // Added x-api-key, x-request-type, and X-CSRF-Token
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400, // Cache preflight requests for 24 hours
  });

  const prisma = app.get(PrismaService);

  // MAINTENANCE middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const allowed = ['/auth/login', '/settings', '/health', '/healthz'];
    if (allowed.some(path => req.path.startsWith(path))) return next();
    try {
      const { general } = await getLiveSettings(prisma);
      if (general.maintenanceMode) {
        // Check if admin - try cookie first, then Authorization header for backward compatibility
        const token = req.cookies?.auth_token || req.headers['authorization']?.replace('Bearer ', '');
        if (token) {
          try {
            const jwt = new JwtService({secret: process.env.JWT_SECRET});
            const payload = jwt.verify(token);
            if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') return next();
          } catch { /* ignore */ }
        }
        return res.status(503).json({ message: 'The system is under maintenance. Please try again later.' });
      }
    } catch (e) { /* fail open if settings not available */ }
    next();
  });

  // Configure rate limiting for 24/7 production API
  // For high-volume job processing (450k+ requests/day), we use flexible limits
  //
  // Calculation for 450,000 requests/day:
  // - Per hour: 450,000 / 24 = 18,750 requests/hour
  // - Per minute: 18,750 / 60 = 312 requests/minute
  // - Per 15 min: 312 * 15 = 4,680 requests/15min
  //
  // Strategy:
  // 1. Job/Queue endpoints: NO rate limiting (handled by queue system + API key auth)
  // 2. General API: 1000 requests/15min per IP (allows for legitimate load balancing)
  // 3. Health checks: NO rate limiting (essential for monitoring)

  // Tiered rate limiting for different types of traffic

  // 1. High-volume rate limiter (for Salesforce API and other high-traffic endpoints)
  const highVolumeRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window for fine-grained control
    max: parseInt(process.env.HIGH_VOLUME_RATE_LIMIT || '1000'), // 1000 requests/minute per IP
    message:
      'Rate limit exceeded for this endpoint. Please try again in a moment.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Exclude /settings for admin
      if (req.path.startsWith('/settings') && isAdmin(req)) return true;
      // Only apply to specific high-volume endpoints
      return !req.url?.startsWith('/v1/salesforce');
    },
  });

  // 2. General API rate limiter (for UI/admin requests)
  const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '500'), // Standard rate for admin endpoints
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Exclude /settings for admin
      if (req.path.startsWith('/settings') && isAdmin(req)) return true;
      // Skip rate limiting for specific endpoints
      return (
        req.url === '/health' ||
        req.url === '/healthz' ||
        req.url?.startsWith('/queue') ||
        req.url?.startsWith('/jobs') ||
        req.url?.startsWith('/v1/salesforce')
      ); // Skip high-volume endpoints (handled separately)
    },
  });

  // Apply both rate limiters
  app.use(highVolumeRateLimiter);
  app.use(generalRateLimiter);

  // Additional security headers middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
  });

  // Configure Helmet with security best practices (no rate limiting)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Set to true if you need COEP
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    }),
  );

  // Register global exception filter for automatic error logging
  const errorsService = app.get(ErrorsService);
  app.useGlobalFilters(new GlobalExceptionFilter(errorsService));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

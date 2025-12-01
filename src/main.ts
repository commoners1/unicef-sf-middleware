import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';
import { getLiveSettings } from '@modules/settings/services/settings.service';
import { PrismaService } from '@infra/database/prisma.service';
import { GlobalExceptionFilter } from '@modules/errors/filters/http-exception.filter';
import { ErrorsService } from '@modules/errors/services/errors.service';
import { CsrfMiddleware } from '@modules/auth/middleware/csrf.middleware';
import { AppModule } from './app.module';

function decodeJwtPayload(token: string): any {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const isAdmin = (req: Request): boolean => {
  const token =
    req.cookies?.auth_token ||
    req.headers['authorization']?.replace('Bearer ', '');
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

  app.use(cookieParser());

  // CSRF protection middleware - must be after cookie parser
  const csrfMiddleware = app.get(CsrfMiddleware);
  app.use(csrfMiddleware.use.bind(csrfMiddleware));

  // Configure request size limits for security
  app.use((req: Request, res: Response, next: NextFunction) => {
    const maxSize = 10 * 1024 * 1024;
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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Configure trust proxy
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', false);
  }

  // Configure CORS
  const getCorsOrigins = (): string | string[] => {
    if (process.env.CORS_ORIGIN) {
      // Support comma-separated origins
      const origins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
      return origins.length === 1 ? origins[0] : origins;
    }
    // Default for development: allow frontend on port 3001
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return [
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost:3000',
      ];
    }
    // Production/staging should always set CORS_ORIGIN explicitly
    throw new Error(
      'CORS_ORIGIN environment variable must be set in production/staging',
    );
  };

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-request-type',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  });

  const prisma = app.get(PrismaService);

  // MAINTENANCE middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const allowed = ['/auth/login', '/settings', '/health', '/healthz'];
    if (allowed.some((path) => req.path.startsWith(path))) return next();
    try {
      const { general } = await getLiveSettings(prisma);
      if (general.maintenanceMode) {
        // Check if admin - try cookie first, then Authorization header for backward compatibility
        const token =
          req.cookies?.auth_token ||
          req.headers['authorization']?.replace('Bearer ', '');
        if (token) {
          try {
            const jwt = new JwtService({ secret: process.env.JWT_SECRET });
            const payload = jwt.verify(token);
            if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN')
              return next();
          } catch {
            /* ignore */
          }
        }
        return res.status(503).json({
          message: 'The system is under maintenance. Please try again later.',
        });
      }
    } catch (e) {
      /* fail open if settings not available */
    }
    next();
  });

  // 1. High-volume rate limiter (for Salesforce API and other high-traffic endpoints)
  const highVolumeRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.HIGH_VOLUME_RATE_LIMIT || '1000'),
    message:
      'Rate limit exceeded for this endpoint. Please try again in a moment.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.path.startsWith('/settings') && isAdmin(req)) return true;
      return !req.url?.startsWith('/v1/salesforce');
    },
  });

  // 2. General API rate limiter (for UI/admin requests)
  const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (req.path.startsWith('/settings') && isAdmin(req)) return true;
      return (
        req.url === '/health' ||
        req.url === '/healthz' ||
        req.url?.startsWith('/queue') ||
        req.url?.startsWith('/jobs') ||
        req.url?.startsWith('/v1/salesforce')
      );
    },
  });

  app.use(highVolumeRateLimiter);
  app.use(generalRateLimiter);

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()',
    );

    // Remove server information
    res.removeHeader('X-Powered-By');

    next();
  });

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
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
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

  const errorsService = app.get(ErrorsService);
  app.useGlobalFilters(new GlobalExceptionFilter(errorsService));

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

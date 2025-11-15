import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import { getLiveSettings } from './settings/settings.service';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@infra/prisma.service';

function decodeJwtPayload(token: string): any {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const isAdmin = (req: Request): boolean => {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = decodeJwtPayload(token);
    return payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
  } catch {
    return false;
  }
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure trust proxy securely for proper handling behind proxies/load balancers
  // Only trust 1 proxy hop in production, disable in development
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust only 1 proxy hop
  } else {
    app.set('trust proxy', false); // Disable in development
  }

  // Configure CORS with security best practices
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // Configure allowed origins via env var
    credentials: true, // Allow cookies/credentials
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-request-type',
    ], // Added x-api-key and x-request-type
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
        // Check if admin
        const token = req.headers['authorization']?.replace('Bearer ', '');
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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

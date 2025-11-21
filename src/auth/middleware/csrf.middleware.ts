import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/**
 * CSRF Middleware - Generates and sets CSRF tokens
 * 
 * Sets a CSRF token in a cookie that the client can read and send back
 * in the X-CSRF-Token header for state-changing requests.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate CSRF token if not present
    let csrfToken = req.cookies?.['csrf-token'];

    if (!csrfToken) {
      csrfToken = crypto.randomBytes(32).toString('hex');
    }

    // Set CSRF token in cookie (not httpOnly so JS can read it)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Must be readable by JavaScript
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Also expose in response header for convenience
    res.setHeader('X-CSRF-Token', csrfToken);

    next();
  }
}


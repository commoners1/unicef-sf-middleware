// src/auth/auth.controller.ts
import { Controller, Post, Body, Request, Response, UseGuards, Get, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import crypto from 'node:crypto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  // In-memory lock to prevent concurrent refresh attempts for the same token
  private readonly refreshLocks = new Map<string, Promise<any>>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      name: string;
      password: string;
      company?: string;
      role?: string;
    },
  ) {
    return this.userService.create(
      body.email,
      body.name,
      body.password,
      body.company,
      (body.role as any) || 'USER',
    );
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await this.authService.login(user, ipAddress, userAgent);
    
    // Set httpOnly cookies for tokens
    // SECURITY: Use secure cookies in production (HTTPS only)
    // In development, allow HTTP for localhost testing
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction || process.env.FORCE_SECURE_COOKIES === 'true';
    
    // Configure sameSite cookie policy
    // 'lax' is more compatible than 'strict' while still providing CSRF protection
    // 'strict' can block cookies in some cross-site scenarios (e.g., redirects from external sites)
    // Can be overridden via COOKIE_SAME_SITE env var: 'strict', 'lax', or 'none'
    const sameSite = (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax';
    
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite, // CSRF protection (configurable)
      maxAge: result.accessTokenExpiresIn * 1000, // Convert to milliseconds
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite, // CSRF protection (configurable)
      maxAge: result.refreshTokenExpiresIn * 1000, // Convert to milliseconds
      path: '/',
    });
    
    // Return user data only (no tokens in response body)
    return {
      user: result.user,
      expiresIn: result.accessTokenExpiresIn,
    };
  }

  @Post('refresh')
  async refresh(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refresh_token;
    
    if (!refreshToken) {
      this.logger.warn('Refresh token not found in cookie', {
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
      throw new UnauthorizedException('Refresh token not found. Please log in first.');
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Create a hash of the refresh token to use as a lock key
    // This prevents concurrent refresh attempts with the same token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Check if there's already a refresh in progress for this token
    let refreshPromise = this.refreshLocks.get(tokenHash);
    
    if (!refreshPromise) {
      // Create a new refresh promise
      refreshPromise = (async () => {
        try {
          const result = await this.authService.refreshToken(refreshToken, ipAddress, userAgent);
          
    // Update cookies with new tokens
    // SECURITY: Use secure cookies in production (HTTPS only)
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction || process.env.FORCE_SECURE_COOKIES === 'true';
    
    // Configure sameSite cookie policy (same as login)
    const sameSite = (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax';
    
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite, // CSRF protection (configurable)
      maxAge: result.accessTokenExpiresIn * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite, // CSRF protection (configurable)
      maxAge: result.refreshTokenExpiresIn * 1000,
      path: '/',
    });
          
          return { success: true, expiresIn: result.accessTokenExpiresIn };
        } finally {
          // Remove the lock after refresh completes (success or failure)
          this.refreshLocks.delete(tokenHash);
        }
      })();
      
      // Store the promise in the lock map
      this.refreshLocks.set(tokenHash, refreshPromise);
    }
    
    try {
      const result = await refreshPromise;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Refresh token failed', { error: errorMessage, ipAddress });
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async logout(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const accessToken = req.cookies?.auth_token || 
                        req.headers['authorization']?.replace('Bearer ', '');
    const refreshToken = req.cookies?.refresh_token;
    const user = (req as any).user;
    
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Revoke tokens and add to blacklist (only if token exists)
    if (accessToken) {
      try {
        await this.authService.logout(
          accessToken,
          refreshToken || null,
          user?.id || null,
          ipAddress,
          userAgent,
        );
      } catch (error) {
        // If logout fails (e.g., token already invalid), still clear cookies
        // This handles edge cases gracefully
      }
    }
    
    // Always clear the httpOnly cookies, even if no token was present
    // This ensures any stale cookies are removed
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSite = (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax';
    
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    });
    
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      path: '/',
    });
    
    return { success: true };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Request() req: ExpressRequest) {
    const user = (req as any).user;
    return this.authService.getUserRefreshTokens(user.id);
  }

  @Post('revoke-all')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async revokeAllSessions(@Request() req: ExpressRequest) {
    const user = (req as any).user;
    await this.authService.revokeAllUserTokens(user.id);
    return { success: true, message: 'All sessions revoked' };
  }
}

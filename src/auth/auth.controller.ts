// src/auth/auth.controller.ts
import { Controller, Post, Body, Request, Response, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';

@Controller('auth')
export class AuthController {
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
    
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: result.accessTokenExpiresIn * 1000, // Convert to milliseconds
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
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
      throw new Error('Refresh token not found');
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await this.authService.refreshToken(refreshToken, ipAddress, userAgent);
    
    // Update cookies with new tokens
    // SECURITY: Use secure cookies in production (HTTPS only)
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction || process.env.FORCE_SECURE_COOKIES === 'true';
    
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: result.accessTokenExpiresIn * 1000,
      path: '/',
    });
    
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: isSecure, // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: result.refreshTokenExpiresIn * 1000,
      path: '/',
    });
    
    return { success: true, expiresIn: result.accessTokenExpiresIn };
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

    // Revoke tokens and add to blacklist
    if (accessToken) {
      await this.authService.logout(
        accessToken,
        refreshToken || null,
        user?.id || null,
        ipAddress,
        userAgent,
      );
    }
    
    // Clear the httpOnly cookies
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
    
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
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

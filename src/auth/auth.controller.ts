// src/auth/auth.controller.ts
import { Controller, Post, Body, Request, Response, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import type { Response as ExpressResponse } from 'express';

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
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    const result = await this.authService.login(user);
    
    // Set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: result.maxAge, // Match JWT expiry time
      path: '/',
    });
    
    // Return user data only (no token in response)
    return {
      user: result.user,
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(
    @Request() req: any,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // Get token from cookie or request (JwtAuthGuard already validated it)
    const token = req.cookies?.auth_token || req.headers['authorization']?.replace('Bearer ', '');
    const result = await this.authService.refreshToken(token);
    
    // Update the cookie with new token
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: result.maxAge, // Match JWT expiry time
      path: '/',
    });
    
    return { success: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Response({ passthrough: true }) res: ExpressResponse) {
    // Clear the httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
    
    return { success: true };
  }
}

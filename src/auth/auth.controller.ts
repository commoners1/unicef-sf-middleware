// src/auth/auth.controller.ts
import { Controller, Post, Body, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

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
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }
}

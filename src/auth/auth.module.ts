// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { TokenService } from './services/token.service';
import { CsrfGuard } from './guards/csrf.guard';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TokenService,
    CsrfGuard,
    CsrfMiddleware,
  ],
  exports: [AuthService, JwtAuthGuard, TokenService, CsrfGuard, CsrfMiddleware],
})
export class AuthModule {}

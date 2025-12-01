import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '@modules/auth/controllers/auth.controller';
import { AuthService } from '@modules/auth/services/auth.service';
import { JwtStrategy } from '@modules/auth/jwt/jwt.strategy';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { TokenService } from '@modules/auth/services/token.service';
import { CsrfGuard } from '@modules/auth/guards/csrf.guard';
import { CsrfMiddleware } from '@modules/auth/middleware/csrf.middleware';
import { UserModule } from '@modules/user/user.module';

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

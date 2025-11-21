// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { getLiveSettings } from '../settings/settings.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const settings = await getLiveSettings(this.userService.getPrisma());
    // check login attempts
    const maxLoginAttempts = settings.security.maxLoginAttempts ?? 5;
    // lastFailedLogin is a Date, failedLoginAttempts is a count (fields must exist in DB, else mock with in-memory for demo)
    if (user.failedLoginAttempts && user.failedLoginAttempts >= maxLoginAttempts && user.lastFailedLogin && (new Date().getTime()-new Date(user.lastFailedLogin).getTime() < 30*60*1000)) {
      throw new ForbiddenException('Maximum login attempts exceeded. Please wait 30 minutes before trying again.');
    }
    const isPasswordValid = await this.userService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      // increment failedLoginAttempts and update lastFailedLogin
      await this.userService.getPrisma().user.update({
        where: { email },
        data: {
          failedLoginAttempts: { increment: 1 },
          lastFailedLogin: new Date(),
        }});
      throw new UnauthorizedException('Invalid credentials');
    }
    // reset on success
    await this.userService.getPrisma().user.update({where: {email}, data:{failedLoginAttempts: 0}});
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
  async login(
    user: { id: string; email: string; name: string; role: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Generate access and refresh token pair
    const tokenPair = await this.tokenService.generateTokenPair(
      user,
      ipAddress,
      userAgent,
    );

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresIn: tokenPair.accessTokenExpiresIn,
      refreshTokenExpiresIn: tokenPair.refreshTokenExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      // Validate refresh token and generate new token pair
      const tokenPair = await this.tokenService.refreshAccessToken(
        refreshToken,
        ipAddress,
        userAgent,
      );

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessTokenExpiresIn: tokenPair.accessTokenExpiresIn,
        refreshTokenExpiresIn: tokenPair.refreshTokenExpiresIn,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid or expired refresh token',
      );
    }
  }

  /**
   * Logout - Revoke tokens and add to blacklist
   */
  async logout(
    accessToken: string,
    refreshToken: string | null,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Decode access token to get expiration
    let expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Default 15 min
    try {
      const payload = this.jwtService.decode(accessToken) as any;
      if (payload?.exp) {
        expiresAt = new Date(payload.exp * 1000);
      }
    } catch {
      // If decode fails, use default expiration
    }

    // Add access token to blacklist
    await this.tokenService.blacklistToken(
      accessToken,
      userId,
      expiresAt,
      'logout',
      ipAddress,
      userAgent,
    );

    // Revoke refresh token if provided
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }

    // Revoke all user tokens if userId is provided (optional: for security breaches)
    // Uncomment if you want to revoke all tokens on logout:
    // if (userId) {
    //   await this.tokenService.revokeAllUserTokens(userId);
    // }
  }

  /**
   * Revoke all tokens for a user (for security breaches, password changes, etc.)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  /**
   * Get active refresh tokens for a user
   */
  async getUserRefreshTokens(userId: string) {
    return this.tokenService.getUserRefreshTokens(userId);
  }
}

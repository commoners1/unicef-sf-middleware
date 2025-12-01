import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { PrismaService } from '@infra/database/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a secure random refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash token for storage (optional, for additional security)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse JWT_EXPIRES_IN string (e.g., "24h", "15m", "7d") to minutes
   */
  private parseExpiresInToMinutes(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/i);
    if (!match) {
      this.logger.warn(
        `Invalid JWT_EXPIRES_IN format: ${expiresIn}, defaulting to 15 minutes`,
      );
      return 15; // Default to 15 minutes if format is invalid
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's': // seconds
        return Math.floor(value / 60);
      case 'm': // minutes
        return value;
      case 'h': // hours
        return value * 60;
      case 'd': // days
        return value * 24 * 60;
      default:
        this.logger.warn(
          `Unknown time unit in JWT_EXPIRES_IN: ${unit}, defaulting to 15 minutes`,
        );
        return 15;
    }
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    user: { id: string; email: string; name: string; role: string },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    // Get access token expiry from config (defaults to 15 minutes if not set or invalid)
    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn', '15m');
    const accessTokenExpiresIn = this.parseExpiresInToMinutes(jwtExpiresIn);
    const refreshTokenExpiresIn = 7 * 24 * 60; // 7 days in minutes

    // Generate access token
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: 'access',
      },
      { expiresIn: `${accessTokenExpiresIn}m` },
    );

    // Generate refresh token
    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshTokenExpiresIn * 60 * 1000,
    );

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(refreshToken), // Store hashed version
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTokenExpiresIn * 60, // in seconds
      refreshTokenExpiresIn: refreshTokenExpiresIn * 60, // in seconds
    };
  }

  /**
   * Validate and refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const hashedToken = this.hashToken(refreshToken);

    // Find refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      this.logger.warn('Refresh token not found in database', { ipAddress });
      throw new Error('Invalid refresh token');
    }

    // Check if token is revoked
    if (storedToken.isRevoked) {
      this.logger.warn('Refresh token has been revoked', {
        userId: storedToken.userId,
        ipAddress,
      });
      throw new Error('Refresh token has been revoked');
    }

    // Check if token is expired
    const now = new Date();
    if (storedToken.expiresAt < now) {
      // Mark as revoked
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: now },
      });

      this.logger.warn('Refresh token has expired', {
        userId: storedToken.userId,
        ipAddress,
      });
      throw new Error('Refresh token has expired');
    }

    // Revoke old refresh token (one-time use)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, revokedAt: now },
    });

    // Generate new token pair
    const user = storedToken.user;
    return this.generateTokenPair(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        token: hashedToken,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Add token to blacklist (for access tokens)
   */
  async blacklistToken(
    token: string,
    userId: string | null,
    expiresAt: Date,
    reason: string = 'logout',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Store token hash for better security
    const tokenHash = this.hashToken(token);

    await this.prisma.tokenBlacklist.create({
      data: {
        token: tokenHash,
        tokenType: 'access',
        userId: userId || null,
        expiresAt,
        reason,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);

    const blacklisted = await this.prisma.tokenBlacklist.findUnique({
      where: { token: tokenHash },
    });

    if (!blacklisted) {
      return false;
    }

    // If token is expired, we can optionally clean it up
    if (blacklisted.expiresAt < new Date()) {
      // Token is expired, no need to check blacklist
      return false;
    }

    return true;
  }

  /**
   * Clean up expired tokens from blacklist
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Also clean up expired refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Get active refresh tokens for a user
   */
  async getUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }
}

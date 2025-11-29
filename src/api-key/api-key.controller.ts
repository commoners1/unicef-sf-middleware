// src/api-key/api-key.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { ApiKeyService } from './api-key.service';
import type { RequestWithUser } from '../types/request.types';
import { Cache, CacheInterceptor, InvalidateCache, InvalidateCacheInterceptor } from '@core/cache';

@Controller('api-key')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('generate')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async generateApiKey(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      name: string;
      description?: string;
      permissions?: string[];
      environment?: string;
    },
  ) {
    return this.apiKeyService.generateApiKey(
      req.user.id,
      body.name,
      body.description,
      body.permissions,
      body.environment || 'production',
    );
  }

  @Get('keys')
  @Cache({ module: 'api-key', endpoint: 'keys', includeUserId: true, ttl: 2 * 60 * 1000 }) // 2 minutes (Tier 2)
  @UseInterceptors(CacheInterceptor)
  async getApiKeys(@Request() req: RequestWithUser) {
    return this.apiKeyService.getUserApiKeys(req.user.id);
  }

  @Get('keys/:environment')
  async getApiKeysByEnvironment(
    @Request() req: RequestWithUser,
    @Body() body: { environment: string },
  ) {
    return this.apiKeyService.getUserApiKeysByEnvironment(
      req.user.id,
      body.environment,
    );
  }

  @Post('revoke')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys' })
  @UseInterceptors(InvalidateCacheInterceptor)
  async revokeApiKey(@Body() body: { key: string }) {
    return this.apiKeyService.revokeApiKey(body.key);
  }

  @Post('delete')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async deleteApiKey(
    @Request() req: RequestWithUser,
    @Body() body: { key: string },
  ) {
    return this.apiKeyService.deleteApiKey(body.key, req.user.id);
  }

  @Post('activate')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async activateApiKey(
    @Request() req: RequestWithUser,
    @Body() body: { key: string },
  ) {
    return this.apiKeyService.activateApiKey(body.key, req.user.id);
  }
}

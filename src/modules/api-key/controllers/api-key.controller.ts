import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import {
  Cache,
  CacheInterceptor,
  InvalidateCache,
  InvalidateCacheInterceptor,
} from '@infra/cache';
import type { RequestWithUser } from '@localTypes/request.types';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { ApiKeyService } from '@modules/api-key/services/api-key.service';
import { GenerateApiKeyDto } from '@modules/api-key/dtos/generate-api-key.dto';
import { ApiKeyEnvironmentDto } from '@modules/api-key/dtos/api-key-environment.dto';
import { ApiKeyKeyDto } from '@modules/api-key/dtos/api-key-key.dto';

@Controller('api-key')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('generate')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async generateApiKey(
    @Request() req: RequestWithUser,
    @Body() body: GenerateApiKeyDto,
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
  @Cache({
    module: 'api-key',
    endpoint: 'keys',
    includeUserId: true,
    ttl: 2 * 60 * 1000,
  })
  @UseInterceptors(CacheInterceptor)
  async getApiKeys(@Request() req: RequestWithUser) {
    return this.apiKeyService.getUserApiKeys(req.user.id);
  }

  @Get('keys/:environment')
  async getApiKeysByEnvironment(
    @Request() req: RequestWithUser,
    @Body() body: ApiKeyEnvironmentDto,
  ) {
    return this.apiKeyService.getUserApiKeysByEnvironment(
      req.user.id,
      body.environment,
    );
  }

  @Post('revoke')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys' })
  @UseInterceptors(InvalidateCacheInterceptor)
  async revokeApiKey(@Body() body: ApiKeyKeyDto) {
    return this.apiKeyService.revokeApiKey(body.key);
  }

  @Post('delete')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async deleteApiKey(
    @Request() req: RequestWithUser,
    @Body() body: ApiKeyKeyDto,
  ) {
    return this.apiKeyService.deleteApiKey(body.key, req.user.id);
  }

  @Post('activate')
  @InvalidateCache({ module: 'api-key', endpoint: 'keys', includeUserId: true })
  @UseInterceptors(InvalidateCacheInterceptor)
  async activateApiKey(
    @Request() req: RequestWithUser,
    @Body() body: ApiKeyKeyDto,
  ) {
    return this.apiKeyService.activateApiKey(body.key, req.user.id);
  }
}

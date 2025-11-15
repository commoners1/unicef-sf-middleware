// src/api-key/api-key.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { ApiKeyService } from './api-key.service';
import type { RequestWithUser } from '../types/request.types';

@Controller('api-key')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('generate')
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
  async revokeApiKey(@Body() body: { key: string }) {
    return this.apiKeyService.revokeApiKey(body.key);
  }

  @Post('delete')
  async deleteApiKey(
    @Request() req: RequestWithUser,
    @Body() body: { key: string },
  ) {
    return this.apiKeyService.deleteApiKey(body.key, req.user.id);
  }

  @Post('activate')
  async activateApiKey(
    @Request() req: RequestWithUser,
    @Body() body: { key: string },
  ) {
    return this.apiKeyService.activateApiKey(body.key, req.user.id);
  }
}

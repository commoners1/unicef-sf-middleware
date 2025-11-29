import { Controller, Get, Put, Body, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { Cache, CacheInterceptor, InvalidateCache, InvalidateCacheInterceptor } from '@core/cache';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Cache({ module: 'settings', endpoint: 'all', ttl: 5 * 60 * 1000 }) // 5 minutes
  @UseInterceptors(CacheInterceptor)
  async get() {
    return await this.settingsService.getAllSettings();
  }

  @Put()
  @InvalidateCache({ module: 'settings' })
  @UseInterceptors(InvalidateCacheInterceptor)
  async update(@Body() patch: any, @Request() req: any) {
    // req.user.role is set by JwtAuthGuard
    return await this.settingsService.updateSettings(patch, req.user.role);
  }
}

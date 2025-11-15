import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get() {
    return await this.settingsService.getAllSettings();
  }

  @Put()
  async update(@Body() patch: any, @Request() req: any) {
    // req.user.role is set by JwtAuthGuard
    return await this.settingsService.updateSettings(patch, req.user.role);
  }
}

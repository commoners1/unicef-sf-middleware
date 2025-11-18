import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { ErrorsService } from './errors.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get()
  async findAll(@Query() query: any) { return this.errorsService.findAll(query); }

  @Get('stats')
  async getStats() { return this.errorsService.getStats(); }

  @Get('trends')
  async getTrends(@Query() query: any) { return this.errorsService.getTrends(query); }

  @Get('sources')
  async getSources() { return this.errorsService.getSources(); }

  @Get('types')
  async getTypes() { return this.errorsService.getTypes(); }

  @Get('environments')
  async getEnvironments() { return this.errorsService.getEnvironments(); }

  @Get(':id')
  async findById(@Param('id') id: string) { return this.errorsService.findById(id); }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string, @Body('resolvedBy') resolvedBy: string) { return this.errorsService.resolve(id, resolvedBy); }

  @Patch(':id/unresolve')
  async unresolve(@Param('id') id: string) { return this.errorsService.unresolve(id); }

  @Delete(':id')
  async delete(@Param('id') id: string) { return this.errorsService.delete(id); }

  @Post('bulk-delete')
  async bulkDelete(@Body('ids') ids: string[]) { return this.errorsService.bulkDelete(ids); }

  @Post('export')
  async export(@Body() body: any) { return this.errorsService.export(body.filters, body.format); }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsString, IsArray } from 'class-validator';
import { Cache, CacheInterceptor } from '@infra/cache';
import { JwtAuthGuard } from '@modules/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/user/entities/user.entity';
import { ErrorsService } from '@modules/errors/services/errors.service';
import { ErrorLogFiltersDto } from '@modules/errors/dtos/error-log-filters.dto';
import { ErrorLogExportDto } from '@modules/errors/dtos/error-log-export.dto';

class ResolveDto {
  @IsString()
  resolvedBy: string;
}

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

class TrendsQueryDto {
  @IsString()
  range?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('errors')
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Get()
  async findAll(@Query() query: ErrorLogFiltersDto) {
    return this.errorsService.findAll(query);
  }

  @Get('stats')
  @Cache({ module: 'errors', endpoint: 'stats', ttl: 2 * 60 * 1000 }) // 2 minutes
  @UseInterceptors(CacheInterceptor)
  async getStats() {
    return this.errorsService.getStats();
  }

  @Get('trends')
  @Cache({
    module: 'errors',
    endpoint: 'trends',
    includeQuery: true,
    ttl: 5 * 60 * 1000,
  }) // 5 minutes
  @UseInterceptors(CacheInterceptor)
  async getTrends(@Query() query: TrendsQueryDto) {
    return this.errorsService.getTrends(query);
  }

  @Get('sources')
  @Cache({ module: 'errors', endpoint: 'sources', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getSources() {
    return this.errorsService.getSources();
  }

  @Get('types')
  @Cache({ module: 'errors', endpoint: 'types', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getTypes() {
    return this.errorsService.getTypes();
  }

  @Get('environments')
  @Cache({ module: 'errors', endpoint: 'environments', ttl: 60 * 60 * 1000 }) // 1 hour
  @UseInterceptors(CacheInterceptor)
  async getEnvironments() {
    return this.errorsService.getEnvironments();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.errorsService.findById(id);
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string, @Body() body: ResolveDto) {
    return this.errorsService.resolve(id, body.resolvedBy);
  }

  @Patch(':id/unresolve')
  async unresolve(@Param('id') id: string) {
    return this.errorsService.unresolve(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.errorsService.delete(id);
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() body: BulkDeleteDto) {
    return this.errorsService.bulkDelete(body.ids);
  }

  @Post('export')
  async export(@Body() body: ErrorLogExportDto, @Res() res: Response) {
    const result = await this.errorsService.export(body.filters, body.format);

    let contentType: string;
    if (body.format === 'csv') {
      contentType = 'text/csv; charset=utf-8';
    } else if (body.format === 'xlsx') {
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      contentType = 'application/json; charset=utf-8';
    }

    const filename = `errors-${new Date().toISOString().split('T')[0]}.${body.format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (body.format === 'xlsx' && Buffer.isBuffer(result)) {
      res.send(result);
    } else {
      res.send(result);
    }
  }
}

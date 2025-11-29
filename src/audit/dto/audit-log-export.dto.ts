import { IsEnum, IsObject, ValidateNested, IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import type { AuditLogFilters } from '@core/utils/audit-filter.util';

class AuditLogFiltersDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  apiKeyId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isDelivered?: boolean;
}

export class AuditLogExportDto {
  @IsEnum(['csv', 'json', 'xlsx'])
  format: 'csv' | 'json' | 'xlsx';

  @IsObject()
  @ValidateNested()
  @Type(() => AuditLogFiltersDto)
  filters: AuditLogFiltersDto;
}


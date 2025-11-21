import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { AuditLogFilters } from '@core/utils/audit-filter.util';

export class AuditLogExportDto {
  @IsEnum(['csv', 'json', 'xlsx'])
  format: 'csv' | 'json' | 'xlsx';

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  filters: AuditLogFilters;
}


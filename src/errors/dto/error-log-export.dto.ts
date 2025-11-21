import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ErrorLogFiltersDto } from './error-log-filters.dto';

export class ErrorLogExportDto {
  @IsEnum(['csv', 'json'])
  format: 'csv' | 'json';

  @IsObject()
  @ValidateNested()
  @Type(() => ErrorLogFiltersDto)
  filters: ErrorLogFiltersDto;
}


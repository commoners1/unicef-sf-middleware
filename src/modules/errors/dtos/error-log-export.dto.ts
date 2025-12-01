import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ErrorLogFiltersDto } from '@modules/errors/dtos/error-log-filters.dto';

export class ErrorLogExportDto {
  @IsEnum(['csv', 'json', 'xlsx'])
  format: 'csv' | 'json' | 'xlsx';

  @IsObject()
  @ValidateNested()
  @Type(() => ErrorLogFiltersDto)
  filters: ErrorLogFiltersDto;
}

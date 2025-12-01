import { IsEnum } from 'class-validator';
import { ApiKeyEnvironment } from '@modules/api-key/dtos/generate-api-key.dto';

export class ApiKeyEnvironmentDto {
  @IsEnum(ApiKeyEnvironment)
  environment: ApiKeyEnvironment;
}

import { IsString, MinLength } from 'class-validator';

export class ApiKeyKeyDto {
  @IsString()
  @MinLength(10)
  key: string;
}

import { IsString, IsOptional } from 'class-validator';

export class JobTypeQueryDto {
    @IsOptional()
    @IsString()
    jobType?: string;
  }
import { IsString, IsArray } from 'class-validator';

export class ResolveDto {
    @IsString()
    resolvedBy: string;
}
  
export class BulkDeleteDto {
    @IsArray()
    @IsString({ each: true })
    ids: string[];
}
  
export class TrendsQueryDto {
    @IsString()
    range?: string;
}
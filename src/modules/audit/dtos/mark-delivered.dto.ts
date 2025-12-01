import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class MarkDeliveredDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  jobIds: string[];
}

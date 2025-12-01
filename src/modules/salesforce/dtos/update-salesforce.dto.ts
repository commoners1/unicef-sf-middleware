import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesforceDto } from '@modules/salesforce/dtos/create-salesforce.dto';

export class UpdateSalesforceDto extends PartialType(CreateSalesforceDto) {}

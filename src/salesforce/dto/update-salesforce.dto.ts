import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesforceDto } from './create-salesforce.dto';

export class UpdateSalesforceDto extends PartialType(CreateSalesforceDto) {}

// src/salesforce/salesforce.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { SalesforceService } from './salesforce.service';
import { AuditService } from '../audit/audit.service';
import { SalesforceTokenResultDto } from '@core/dto/salesforce.dto';
import type { AuthenticatedRequest } from '../types/request.types';

@Controller('v1/salesforce')
@UseGuards(ApiKeyGuard)
export class SalesforceController {
  constructor(
    private readonly salesforceService: SalesforceService,
    private readonly auditService: AuditService,
  ) {}

  @Get('token')
  async getToken(
    @Request() req: AuthenticatedRequest,
  ): Promise<SalesforceTokenResultDto> {
    return this.salesforceService.getToken(
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
      req.headers['x-request-type'] as string, // Custom header for type (optional)
    );
  }

  @Post('token')
  async refreshToken(
    @Request() req: AuthenticatedRequest,
  ): Promise<SalesforceTokenResultDto> {
    return this.salesforceService.getToken(
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
      req.headers['x-request-type'] as string, // Custom header for type (optional)
    );
  }

  @Post('pledge')
  async callPledgeApi(
    @Body() body: { payload: Record<string, unknown>; token: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.salesforceService.callPledgeApi(
      body.payload,
      body.token,
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
    );
  }

  @Post('pledge-charge')
  async callPledgeChargeApi(
    @Body() body: { payload: Record<string, unknown>; token: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.salesforceService.callPledgeChargeApi(
      body.payload,
      body.token,
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
    );
  }

  @Post('oneoff')
  async callOneOffApi(
    @Body() body: { payload: Record<string, unknown>; token: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.salesforceService.callOneOffApi(
      body.payload,
      body.token,
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
    );
  }

  @Post('payment-link')
  async callPaymentLinkApi(
    @Body() body: { payload: Record<string, unknown>; token: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.salesforceService.callXenditPaymentLinkApi(
      body.payload,
      body.token,
      req.ip || 'unknown',
      req.headers['user-agent'] as string,
      req.user?.id,
      req.apiKey?.id,
    );
  }

  // New API: Get Pledge Cron Job data
  @Get('pledge-cron-jobs')
  async getPledgeCronJobs(@Request() _req: AuthenticatedRequest) {
    const jobs = await this.auditService.getUndeliveredCronJobs(
      null,
      'pledge',
      1000,
    );

    // Mark retrieved jobs as delivered
    if (jobs.length > 0) {
      const jobIds = jobs.map((job: { id: string }) => job.id);
      await this.auditService.markAsDelivered(jobIds);
    }

    return {
      jobs,
      count: jobs.length,
      timestamp: new Date().toISOString(),
    };
  }

  // New API: Get One Off Cron Job data
  @Get('oneoff-cron-jobs')
  async getOneOffCronJobs(@Request() _req: AuthenticatedRequest) {
    const jobs = await this.auditService.getUndeliveredCronJobs(
      null,
      'oneoff',
      1000,
    );

    // Mark retrieved jobs as delivered
    if (jobs.length > 0) {
      const jobIds = jobs.map((job: { id: string }) => job.id);
      await this.auditService.markAsDelivered(jobIds);
    }

    return {
      jobs,
      count: jobs.length,
      timestamp: new Date().toISOString(),
    };
  }
}

// src/queue/processors/salesforce.processor.ts
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { SalesforceJob } from '@localTypes/queue.types';
import { AuditService } from '@modules/audit/services/audit.service';
import { ErrorsService } from '@modules/errors/services/errors.service';
import { SalesforceConfigService } from '@core/config/salesforce-config.service';
import { StructuredLogger } from '@core/logging/structured-logger.util';
import { SalesforceService } from '@modules/salesforce/services/salesforce.service';
import { BatchProcessorService } from '@modules/queue/services/batch-processor.service';
import { PerformanceMonitorService } from '@modules/queue/services/performance-monitor.service';
import { SalesforceProcessorResultResponse } from '@modules/queue/interfaces/salesforce-processor.interface';

@Processor('salesforce')
export class SalesforceProcessor extends WorkerHost {
  private readonly logger = new Logger(SalesforceProcessor.name);
  private readonly structuredLogger = new StructuredLogger(this.logger);
  private readonly metrics = {
    processed: 0,
    failed: 0,
    avgProcessingTime: 0,
    totalProcessingTime: 0,
  };
  private readonly endpoints: ReturnType<
    SalesforceConfigService['getEndpoints']
  >;

  constructor(
    private readonly salesforceService: SalesforceService,
    private readonly batchProcessor: BatchProcessorService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly auditService: AuditService,
    private readonly errorsService: ErrorsService,
    private readonly salesforceConfig: SalesforceConfigService,
  ) {
    super();
    this.endpoints = this.salesforceConfig.getEndpoints();
    this.startMetricsCollection();
  }

  async process(job: SalesforceJob): Promise<Record<string, unknown> | null> {
    const startTime = Date.now();
    const {
      endpoint,
      payload,
      token,
      type,
      clientId,
      auditId,
      userId,
      apiKeyId,
    } = job.data;

    this.structuredLogger.jobStart(job.id?.toString() || 'unknown', {
      userId,
      endpoint,
      type,
      attempt: job.attemptsMade + 1,
      totalAttempts: job.attemptsMade + 1,
    });

    try {
      // Log job processing start
      await this.auditService.logJobProcessing(
        userId || null,
        apiKeyId || null,
        job.id?.toString() || 'unknown',
        'salesforce_api',
        endpoint,
        'started',
      );

      // Update job status to processing using batch processor
      await this.batchProcessor.updateJobStatus(auditId, 'processing');

      // Process the Salesforce API call with enhanced error handling
      const result = await this.salesforceService.directApi(
        this.endpoints.BASE_URL + endpoint,
        payload,
        {
          Authorization: `Bearer ${token}`,
          ClientId: clientId,
        },
        true,
      );

      if (result && result.data) {
        // Handle different response structures
        const responseData = result.data;
        let itemsToProcess: unknown[] = [];

        // Check if result.data.data exists (array structure from formatResponseData)
        if (responseData.data && Array.isArray(responseData.data)) {
          itemsToProcess = responseData.data;
        } else if (Array.isArray(responseData)) {
          itemsToProcess = responseData;
        } else if (typeof responseData === 'object' && responseData !== null) {
          // Single object response, wrap it in an array
          itemsToProcess = [responseData];
        }

        // Process each item
        for (const res of itemsToProcess) {
          if (res !== null) {
            if (
              res &&
              typeof res === 'object' &&
              'Success' in res &&
              res.Success !== null
            ) {
              const responseData = res as SalesforceProcessorResultResponse;

              await this.auditService.logApiCall(
                userId || null,
                null,
                'CRON_JOB',
                endpoint,
                'call' + type.charAt(0).toUpperCase() + type.slice(1),
                type,
                payload,
                responseData,
                result.httpCode,
                'system',
                'queue-processor',
                Date.now() - startTime,
                responseData.OrderId ?? null,
                responseData.Id ?? null,
                responseData.Message ?? null,
                null,
              );
            }
          }
        }
      }

      const processingTime = Date.now() - startTime;

      // Update job status to completed using batch processor
      await this.batchProcessor.updateJobStatus(
        auditId,
        'completed',
        result as unknown as Record<string, unknown>,
        undefined,
        processingTime,
      );

      // Log job processing completion
      await this.auditService.logJobProcessing(
        userId || null,
        apiKeyId || null,
        job.id?.toString() || 'unknown',
        'salesforce_api',
        endpoint,
        'completed',
        processingTime,
        undefined,
        {
          status: 'completed',
          message: 'Salesforce job processed successfully',
          jobId: job.id?.toString() || 'unknown',
          processingTime: processingTime,
          timestamp: new Date().toISOString(),
        },
      );

      // Update metrics
      this.updateMetrics(processingTime, true);

      this.structuredLogger.jobComplete(
        job.id?.toString() || 'unknown',
        processingTime,
        {
          userId,
          endpoint,
          type,
          attempt: job.attemptsMade + 1,
        },
      );
      return result as unknown as Record<string, unknown>;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Enhanced error categorization
      const errorType = this.categorizeError(error);
      const shouldRetry = this.shouldRetryJob(error, job.attemptsMade);

      this.structuredLogger.jobFailed(
        job.id?.toString() || 'unknown',
        error,
        processingTime,
        {
          userId,
          endpoint,
          type,
          attempt: job.attemptsMade + 1,
          errorType,
          willRetry: shouldRetry,
        },
      );

      if (shouldRetry) {
        this.structuredLogger.warn(`Job will be retried`, {
          jobId: job.id?.toString(),
          errorType,
          attempt: job.attemptsMade + 1,
        });
      } else {
        await this.batchProcessor.updateJobStatus(
          auditId,
          'failed',
          null,
          errorMessage,
          processingTime,
        );

        // Log job processing failure
        await this.auditService.logJobProcessing(
          userId || null,
          apiKeyId || null,
          job.id?.toString() || 'unknown',
          'salesforce_api',
          endpoint,
          'failed',
          processingTime,
          errorMessage,
        );

        // Log error to ErrorLog table
        try {
          const environment =
            process.env.NODE_ENV === 'production'
              ? 'production'
              : process.env.NODE_ENV === 'staging'
                ? 'staging'
                : 'development';

          const errorCategory = this.categorizeError(error);
          const errorLogType =
            errorCategory === 'SERVER_ERROR' ||
            errorCategory === 'CONNECTION_ERROR'
              ? 'critical'
              : errorCategory === 'AUTHENTICATION_ERROR' ||
                  errorCategory === 'AUTHORIZATION_ERROR'
                ? 'error'
                : 'warning';

          await this.errorsService.logError({
            message: `Salesforce job ${job.id} failed: ${errorMessage}`,
            type: errorLogType,
            source: 'salesforce-processor',
            environment: environment,
            stackTrace: error instanceof Error ? error.stack : undefined,
            ...(userId ? { user: { connect: { id: userId } } } : {}),
            statusCode: (error as any)?.response?.status || null,
            metadata: {
              jobId: job.id?.toString(),
              endpoint: endpoint,
              errorType: errorCategory,
              processingTime: processingTime,
              attemptsMade: job.attemptsMade,
              shouldRetry: shouldRetry,
            },
          });
        } catch (logError) {
          // Don't fail the job if error logging fails
          this.structuredLogger.error(
            'Failed to log error to ErrorLog',
            logError,
            {
              jobId: job.id?.toString(),
              originalError: errorMessage,
            },
          );
        }
      }

      // Update metrics
      this.updateMetrics(processingTime, false);

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.structuredLogger.jobComplete(job.id?.toString() || 'unknown', 0, {
      event: 'worker_completed',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.structuredLogger.jobFailed(job.id?.toString() || 'unknown', err, 0, {
      event: 'worker_failed',
    });
  }

  private categorizeError(error: unknown): string {
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      if (err.response && typeof err.response === 'object') {
        const response = err.response as Record<string, unknown>;
        if (typeof response.status === 'number') {
          if (response.status === 401) return 'AUTHENTICATION_ERROR';
          if (response.status === 403) return 'AUTHORIZATION_ERROR';
          if (response.status === 429) return 'RATE_LIMIT_ERROR';
          if (response.status >= 500) return 'SERVER_ERROR';
        }
      }
      if (typeof err.code === 'string') {
        if (err.code === 'ECONNREFUSED') return 'CONNECTION_ERROR';
        if (err.code === 'ETIMEDOUT') return 'TIMEOUT_ERROR';
      }
    }
    return 'UNKNOWN_ERROR';
  }

  private shouldRetryJob(error: unknown, attemptsMade: number): boolean {
    const maxAttempts = 2; // Reduced for high volume
    const retryableErrors = [
      'SERVER_ERROR',
      'CONNECTION_ERROR',
      'RATE_LIMIT_ERROR',
      'TIMEOUT_ERROR',
    ];
    const errorType = this.categorizeError(error);

    return attemptsMade < maxAttempts && retryableErrors.includes(errorType);
  }

  private updateMetrics(processingTime: number, success: boolean): void {
    this.metrics.processed++;
    if (!success) this.metrics.failed++;

    this.metrics.totalProcessingTime += processingTime;
    this.metrics.avgProcessingTime =
      this.metrics.totalProcessingTime / this.metrics.processed;
  }

  private startMetricsCollection(): void {
    // Log metrics every 5 minutes
    setInterval(() => {
      // Compute success rate outside logger call
      const successRate =
        this.metrics.processed > 0
          ? ((this.metrics.processed - this.metrics.failed) /
              this.metrics.processed) *
            100
          : 0;

      this.structuredLogger.metrics({
        source: 'salesforce_processor',
        processed: this.metrics.processed,
        failed: this.metrics.failed,
        successRate: Number(successRate.toFixed(2)),
        avgProcessingTime: Number(this.metrics.avgProcessingTime.toFixed(2)),
      });
    }, 300000); // 5 minutes
  }

  getProcessorMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.processed > 0
          ? (
              ((this.metrics.processed - this.metrics.failed) /
                this.metrics.processed) *
              100
            ).toFixed(2) + '%'
          : '0%',
    };
  }
}

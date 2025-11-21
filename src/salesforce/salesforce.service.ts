import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import {
  SalesforceTokenRequestDto,
  SalesforceTokenResultDto,
  DirectApiResponseDto,
  PaymentApiResponseDto,
} from '@core/dto/salesforce.dto';
import { PrismaService } from '@infra/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SalesforceConfigService } from '@core/services/salesforce-config.service';

@Injectable()
export class SalesforceService {
  private readonly logger = new Logger(SalesforceService.name);
  private readonly endpoints: ReturnType<SalesforceConfigService['getEndpoints']>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly salesforceConfig: SalesforceConfigService,
  ) {
    this.endpoints = this.salesforceConfig.getEndpoints();
  }

  async getToken(
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    apiKeyId?: string,
    type?: string,
  ): Promise<SalesforceTokenResultDto> {
    const payload: SalesforceTokenRequestDto = {
      grant_type: 'client_credentials',
      client_id: this.configService.getOrThrow<string>('SF_CLIENT_ID'),
      client_secret: this.configService.getOrThrow<string>('SF_CLIENT_SECRET'),
      resource: this.configService.getOrThrow<string>('SF_RESOURCE_API'),
    };

    const requestTimestamp = new Date();
    let response: DirectApiResponseDto | null = null;
    let error: Error | null = null;

    try {
      response = await this.directApi(
        this.configService.getOrThrow<string>('SF_TOKEN_URL'),
        payload,
        null,
        false,
      );

      if (response.error) {
        throw new Error(
          `API Error: ${response.data?.message || 'Unknown error'}`,
        );
      }

      return {
        tokenResponse: response.data,
        requestTimestamp,
        success: true,
      };
    } catch (err: unknown) {
      error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error('Failed to get Salesforce token', error);

      return {
        tokenResponse: null as never,
        requestTimestamp,
        success: false,
        error: error.message,
      };
    } finally {
      if (type && ipAddress && userAgent && userId && apiKeyId) {
        try {
          const duration = Date.now() - requestTimestamp.getTime();

          let responseData: Record<string, unknown> | null;
          let statusCode: number;

          if (response) {
            responseData = response.data;
            statusCode = response.httpCode;
          } else {
            responseData = {
              error: true,
              message: error?.message || 'Unknown error',
            };
            statusCode = 500;
          }

          await this.auditService.logApiCall(
            userId,
            apiKeyId,
            'POST',
            '/v1/salesforce/token',
            'getToken',
            type || 'token',
            payload,
            responseData,
            statusCode,
            ipAddress,
            userAgent,
            duration,
            null,
            null,
            null,
            null,
          );
        } catch (auditError: unknown) {
          const errorMessage =
            auditError instanceof Error
              ? auditError.message
              : 'Unknown audit error';
          this.logger.error('Failed to log audit', errorMessage);
        }
      }
    }
  }

  async directApi(
    url: string = '',
    payload: Record<string, unknown> | null = null,
    httpHeaders: Record<string, string> | null = null,
    isJson: boolean = true,
  ): Promise<DirectApiResponseDto> {
    return this.makeApiCall(
      url,
      payload,
      httpHeaders,
      isJson,
      'SF_SUBSCRIPTION_KEY',
    );
  }

  async directApiPayment(
    url: string = '',
    payload: Record<string, unknown> | null = null,
    httpHeaders: Record<string, string> | null = null,
    isJson: boolean = true,
  ): Promise<PaymentApiResponseDto> {
    const result = await this.makeApiCall(
      url,
      payload,
      httpHeaders,
      isJson,
      'SF_SUBSCRIPTION_PAYMENT_KEY',
    );

    return {
      ...result,
      header: {
        url: url,
        ...this.buildHeaders(
          isJson,
          'SF_SUBSCRIPTION_PAYMENT_KEY',
          httpHeaders,
        ),
      },
    };
  }

  private async makeApiCall(
    url: string = '',
    payload: Record<string, unknown> | null = null,
    httpHeaders: Record<string, string> | null = null,
    isJson: boolean = true,
    subscriptionKeyEnv: string = 'SF_SUBSCRIPTION_KEY',
  ): Promise<DirectApiResponseDto> {
    try {
      if (!this.isValidUrl(url)) {
        url = this.configService.getOrThrow<string>('SF_BASE_ENDPOINT') + url;
      }

      const headers = this.buildHeaders(
        isJson,
        subscriptionKeyEnv,
        httpHeaders,
      );

      const config: AxiosRequestConfig = {
        headers,
        timeout: 30000,
        validateStatus: () => true,
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: true,
        }),
      };

      let response: AxiosResponse;

      if (payload) {
        if (isJson) {
          response = await axios.post(url, payload, config);
        } else {
          const formData = new URLSearchParams();
          Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          response = await axios.post(url, formData, config);
        }
      } else {
        response = await axios.get(url, config);
      }

      const httpCode = response.status;
      const responseData = response.data;

      const formatResponseData = (
        data: any,
        httpStatus: number,
        isError: boolean,
      ) => {
        if (Array.isArray(data)) {
          return {
            data: data,
            error: isError,
            http_code: httpStatus,
          };
        } else if (typeof data === 'object' && data !== null) {
          return {
            ...data,
            error: isError,
            http_code: httpStatus,
          };
        } else {
          return {
            value: data,
            error: isError,
            http_code: httpStatus,
          };
        }
      };

      if (httpCode >= 200 && httpCode < 300) {
        return {
          data: formatResponseData(responseData, httpCode, false),
          httpCode,
          error: false,
          success: true,
          headers: response.headers as Record<string, string>,
          url,
        };
      } else if (httpCode >= 500 && httpCode < 600) {
        return {
          data: formatResponseData(responseData, httpCode, true),
          httpCode,
          error: true,
          success: false,
          headers: response.headers as Record<string, string>,
          url,
        };
      } else {
        return {
          data: formatResponseData(responseData, httpCode, true),
          httpCode,
          error: true,
          success: false,
          headers: response.headers as Record<string, string>,
          url,
        };
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Direct API call failed', {
        url,
        error: errorMessage,
        stack: errorStack,
      });

      return {
        data: {
          error: true,
          message: errorMessage,
          http_code: 0,
        },
        httpCode: 0,
        error: true,
        success: false,
        url,
      };
    }
  }

  private buildHeaders(
    isJson: boolean,
    subscriptionKeyEnv: string,
    httpHeaders?: Record<string, string> | null,
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (isJson) {
      Object.assign(headers, {
        CountryCode: 'IDN',
        SchemaVersion: '1.0',
        MapVersion: '1.0',
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key':
          this.configService.getOrThrow<string>(subscriptionKeyEnv),
      });
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    if (httpHeaders) {
      Object.assign(headers, httpHeaders);
    }

    return headers;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private getRefId(
    payload: any, 
    response: Record<string, unknown>
  ): string | null {
    return (
      this.getString((response as any)?.OrderId) ??
      this.getString(payload?.SourceExternalId) ??
      this.getString(payload?.PledgeId) ??
      this.getString(payload?.TransactionDetails?.SourceExternalId) ??
      null
    )
  }

  async callPledgeApi(
    payload: any,
    token: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    userId?: string | null,
    apiKeyId?: string | null,
  ): Promise<DirectApiResponseDto> {
    const requestTimestamp = new Date();

    try {
      const response = await this.directApi(
        this.endpoints.ENDPOINTS.PLEDGE,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      const refId = this.getRefId(payload, response.data);

      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/pledge',
          'callPledgeApi',
          'post-monthly',
          payload,
          response.data,
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          refId,
          null,
          response.data.Message,
          null,
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call pledge API', error);
      throw error;
    }
  }

  async callPledgeChargeApi(
    payload: any,
    token: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    userId?: string | null,
    apiKeyId?: string | null,
  ): Promise<DirectApiResponseDto> {
    const requestTimestamp = new Date();

    try {
      const response = await this.directApi(
        this.endpoints.ENDPOINTS.PLEDGE_CHARGE,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      const refId = this.getRefId(payload, response.data);

      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/pledge-charge',
          'callPledgeChargeApi',
          'charge',
          payload,
          response.data,
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          refId,
          response.data.Id,
          response.data.Message,
          null,
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call pledge charge API', error);
      throw error;
    }
  }

  async callOneOffApi(
    payload: any,
    token: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    userId?: string | null,
    apiKeyId?: string | null,
  ): Promise<DirectApiResponseDto> {
    const requestTimestamp = new Date();

    try {
      const response = await this.directApi(
        this.endpoints.ENDPOINTS.ONEOFF,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      const refId = this.getRefId(payload, response.data);

      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/oneoff',
          'callOneOffApi',
          'post-oneoff',
          payload,
          response.data,
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          refId,
          null,
          response.data.Message,
          null,
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call oneoff API', error);
      throw error;
    }
  }

  async callXenditPaymentLinkApi(
    payload: any,
    token: string,
    ipAddress?: string | null,
    userAgent?: string | null,
    userId?: string | null,
    apiKeyId?: string | null,
  ): Promise<DirectApiResponseDto> {
    const requestTimestamp = new Date();

    try {
      const response = await this.directApiPayment(
        this.endpoints.ENDPOINTS.XENDIT_PAYMENT_LINK,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      const refId = this.getRefId(payload, response.data);

      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/payment-link',
          'callXenditPaymentLinkApi',
          'payment-link',
          payload,
          response.data,
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          refId,
          null,
          response.data.message,
          null,
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call xendit payment link API', error);
      throw error;
    }
  }
}

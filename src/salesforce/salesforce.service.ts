// src/salesforce/services/salesforce.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import {
  SalesforceTokenRequestDto,
  SalesforceTokenResultDto,
  DirectApiResponseDto,
  PaymentApiResponseDto,
} from '@core/dto/salesforce.dto';
import { SALESFORCE_ENDPOINTS } from '@core/utils/constants';
import { PrismaService } from '@infra/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SalesforceService {
  private readonly logger = new Logger(SalesforceService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
        false, // isJson = false for form data
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

      // Return error response
      return {
        tokenResponse: null as never,
        requestTimestamp,
        success: false,
        error: error.message,
      };
    } finally {
      // Always log audit (success or error) if type is provided
      if (type && ipAddress && userAgent && userId && apiKeyId) {
        try {
          const duration = Date.now() - requestTimestamp.getTime();

          // Determine response data and status code
          let responseData: Record<string, unknown> | null;
          let statusCode: number;

          if (response) {
            // We have a response (either success or error from API)
            responseData = response.data;
            statusCode = response.httpCode;
          } else {
            // Error before API call completed
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
            responseData, // Includes both success and error responses
            statusCode,
            ipAddress,
            userAgent,
            duration,
          );
        } catch (auditError: unknown) {
          const errorMessage =
            auditError instanceof Error
              ? auditError.message
              : 'Unknown audit error';
          this.logger.error('Failed to log audit', errorMessage);
          // Don't fail the request if audit logging fails
        }
      }
    }
  }

  /**
   * Enhanced directApi method that replicates PHP functionality
   */
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

  /**
   * Payment API method that uses SF_SUBSCRIPTION_PAYMENT_KEY
   */
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

    // Add header information for compatibility with PHP response
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

  /**
   * Generic method for making API calls
   */
  private async makeApiCall(
    url: string = '',
    payload: Record<string, unknown> | null = null,
    httpHeaders: Record<string, string> | null = null,
    isJson: boolean = true,
    subscriptionKeyEnv: string = 'SF_SUBSCRIPTION_KEY',
  ): Promise<DirectApiResponseDto> {
    try {
      // Validate and construct full URL
      if (!this.isValidUrl(url)) {
        url = this.configService.getOrThrow<string>('SF_BASE_ENDPOINT') + url;
      }

      // Prepare headers based on isJson flag
      const headers = this.buildHeaders(
        isJson,
        subscriptionKeyEnv,
        httpHeaders,
      );

      // Prepare request config
      const config: AxiosRequestConfig = {
        headers,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on HTTP error status codes
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: true,
          // Note: In Node.js, you might need to handle SSL certificates differently
          // For production, consider using proper certificate management
        }),
      };

      let response: AxiosResponse;

      if (payload) {
        // POST request
        if (isJson) {
          response = await axios.post(url, payload, config);
        } else {
          // Convert payload to URL-encoded format
          const formData = new URLSearchParams();
          Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          response = await axios.post(url, formData, config);
        }
      } else {
        // GET request
        response = await axios.get(url, config);
      }

      const httpCode = response.status;
      const responseData = response.data;

      // Helper function to format response data
      const formatResponseData = (
        data: any,
        httpStatus: number,
        isError: boolean,
      ) => {
        if (Array.isArray(data)) {
          // If data is an array, wrap it in an object
          return {
            data: data,
            error: isError,
            http_code: httpStatus,
          };
        } else if (typeof data === 'object' && data !== null) {
          // If data is an object, spread it
          return {
            ...data,
            error: isError,
            http_code: httpStatus,
          };
        } else {
          // Primitive types (string, number, boolean, null)
          return {
            value: data,
            error: isError,
            http_code: httpStatus,
          };
        }
      };

      // Process response based on HTTP status code
      if (httpCode >= 200 && httpCode < 300) {
        // Successful response
        return {
          data: formatResponseData(responseData, httpCode, false),
          httpCode,
          error: false,
          success: true,
          headers: response.headers as Record<string, string>,
          url,
        };
      } else if (httpCode >= 500 && httpCode < 600) {
        // Server error
        return {
          data: formatResponseData(responseData, httpCode, true),
          httpCode,
          error: true,
          success: false,
          headers: response.headers as Record<string, string>,
          url,
        };
      } else {
        // Client errors (400-499)
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

      // Handle network errors similar to PHP curl_error
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

  /**
   * Build headers based on configuration
   */
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

    // Merge additional headers if provided
    if (httpHeaders) {
      Object.assign(headers, httpHeaders);
    }

    return headers;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Secure API call for Pledge operations
   */
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
        SALESFORCE_ENDPOINTS.ENDPOINTS.PLEDGE,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      // Log audit (includes both success and error responses)
      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/pledge',
          'callPledgeApi',
          'post-monthly',
          payload,
          response.data, // response.data contains both success and error data
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
        // Don't fail the request if audit logging fails
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call pledge API', error);
      throw error; // Re-throw to let the caller handle it
    }
  }

  /**
   * Secure API call for Pledge Charge operations
   */
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
        SALESFORCE_ENDPOINTS.ENDPOINTS.PLEDGE_CHARGE,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      // Log audit (includes both success and error responses)
      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/pledge-charge',
          'callPledgeChargeApi',
          'charge',
          payload,
          response.data, // response.data contains both success and error data
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
        // Don't fail the request if audit logging fails
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call pledge charge API', error);
      throw error;
    }
  }

  /**
   * Secure API call for One Off operations
   */
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
        SALESFORCE_ENDPOINTS.ENDPOINTS.ONEOFF,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      // Log audit (includes both success and error responses)
      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/oneoff',
          'callOneOffApi',
          'post-oneoff',
          payload,
          response.data, // response.data contains both success and error data
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
        // Don't fail the request if audit logging fails
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call oneoff API', error);
      throw error;
    }
  }

  /**
   * Secure API call for Xendit Payment Link operations
   */
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
      const response = await this.directApi(
        SALESFORCE_ENDPOINTS.ENDPOINTS.XENDIT_PAYMENT_LINK,
        payload,
        { Authorization: `Bearer ${token}` },
        true,
      );

      // Log audit (includes both success and error responses)
      try {
        await this.auditService.logApiCall(
          userId ?? null,
          apiKeyId ?? null,
          'POST',
          '/v1/salesforce/xendit-payment-link',
          'callXenditPaymentLinkApi',
          'payment-link',
          payload,
          response.data, // response.data contains both success and error data
          response.httpCode,
          ipAddress ?? 'unknown',
          userAgent ?? 'unknown',
          Date.now() - requestTimestamp.getTime(),
          true,
        );
      } catch (auditError: unknown) {
        const errorMessage =
          auditError instanceof Error
            ? auditError.message
            : 'Unknown audit error';
        this.logger.error('Failed to log audit', errorMessage);
        // Don't fail the request if audit logging fails
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to call xendit payment link API', error);
      throw error;
    }
  }
}

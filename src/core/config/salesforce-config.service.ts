// libs/core/services/salesforce-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SalesforceEndpoints {
  BASE_URL: string;
  ENDPOINTS: {
    PLEDGE: string;
    PLEDGE_CHARGE: string;
    ONEOFF: string;
    XENDIT_PAYMENT_LINK: string;
    PLEDGE_API: string;
    PLEDGE_CHARGE_API: string;
    ONEOFF_API: string;
    XENDIT_PAYMENT_LINK_API: string;
  };
  TYPES: {
    PLEDGE_TYPES: {
      POST_MONTHLY_SEND: string;
      POST_MONTHLY: string;
      PLEDGE: string;
    };
    PLEDGE_CHARGE: {
      CHARGE_SEND: string;
      CHARGE: string;
    };
    ONEOFF_TYPES: {
      POST_ONEOFF_SEND: string;
      POST_ONEOFF: string;
      ONEOFF: string;
    };
    XENDIT_PAYMENT_LINK: {
      PAYMENT_LINK_SEND: string;
      PAYMENT_LINK: string;
    };
  };
}

@Injectable()
export class SalesforceConfigService {
  private readonly baseUrl: string;
  private readonly endpoints: SalesforceEndpoints;

  constructor(private readonly configService: ConfigService) {
    // Use getOrThrow to ensure the environment variable is set
    // This will throw a clear error if SF_BASE_ENDPOINT is missing
    this.baseUrl = this.configService.getOrThrow<string>(
      'SF_BASE_ENDPOINT',
      'SF_BASE_ENDPOINT environment variable is required. Please set it in your .env file or environment variables.',
    );

    // Build endpoints object
    this.endpoints = {
      BASE_URL: this.baseUrl,
      ENDPOINTS: {
        PLEDGE: `${this.baseUrl}/core/pledge/v2.0/`,
        PLEDGE_CHARGE: `${this.baseUrl}/core/pledgewcharge/v2.0/`,
        ONEOFF: `${this.baseUrl}/core/oneoff/v2.0/`,
        XENDIT_PAYMENT_LINK: `${this.baseUrl}/idn/v2.0/xendit/`,
        PLEDGE_API: `/core/pledge/v2.0/`,
        PLEDGE_CHARGE_API: `/core/pledgewcharge/v2.0/`,
        ONEOFF_API: `/core/oneoff/v2.0/`,
        XENDIT_PAYMENT_LINK_API: `/idn/v2.0/xendit/`,
      },
      TYPES: {
        PLEDGE_TYPES: {
          POST_MONTHLY_SEND: 'post-monthly-send',
          POST_MONTHLY: 'post-monthly',
          PLEDGE: 'pledge',
        },
        PLEDGE_CHARGE: {
          CHARGE_SEND: 'charge-send',
          CHARGE: 'charge',
        },
        ONEOFF_TYPES: {
          POST_ONEOFF_SEND: 'post-oneoff-send',
          POST_ONEOFF: 'post-oneoff',
          ONEOFF: 'oneoff',
        },
        XENDIT_PAYMENT_LINK: {
          PAYMENT_LINK_SEND: 'payment-link-send',
          PAYMENT_LINK: 'payment-link',
        },
      },
    };
  }

  /**
   * Get the Salesforce base URL
   * @throws Error if SF_BASE_ENDPOINT is not configured
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get all Salesforce endpoints configuration
   * @throws Error if SF_BASE_ENDPOINT is not configured
   */
  getEndpoints(): SalesforceEndpoints {
    return this.endpoints;
  }

  /**
   * Get a specific endpoint by key
   * @throws Error if SF_BASE_ENDPOINT is not configured
   */
  getEndpoint(key: keyof SalesforceEndpoints['ENDPOINTS']): string {
    return this.endpoints.ENDPOINTS[key];
  }

  /**
   * Get endpoint types configuration
   */
  getTypes(): SalesforceEndpoints['TYPES'] {
    return this.endpoints.TYPES;
  }
}

export class SalesforceTokenRequestDto {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  resource: string;
  [key: string]: unknown;
}

export class SalesforceTokenResponseDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  instance_url?: string;
}

export class SalesforceTokenResultDto {
  tokenResponse: SalesforceTokenResponseDto;
  requestTimestamp: Date;
  success: boolean;
  error?: string;
}

// Enhanced DTOs for both APIs
export class DirectApiRequestDto {
  url: string;
  payload?: Record<string, any>;
  httpHeaders?: Record<string, string>;
  isJson?: boolean;
}

export class DirectApiResponseDto {
  data: any;
  httpCode: number;
  error: boolean;
  success: boolean;
  headers?: Record<string, string>;
  url?: string;
}

// New DTOs for Payment API
export class PaymentApiRequestDto {
  url: string;
  payload?: Record<string, any>;
  httpHeaders?: Record<string, string>;
  isJson?: boolean;
}

export class PaymentApiResponseDto {
  data: any;
  httpCode: number;
  error: boolean;
  success: boolean;
  headers?: Record<string, string>;
  url?: string;
  header?: Record<string, string>; // For compatibility with PHP response
}

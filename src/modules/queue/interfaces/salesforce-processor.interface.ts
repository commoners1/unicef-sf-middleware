export interface SalesforceProcessorResultResponse
  extends Record<string, unknown> {
  Id?: string | null;
  Message?: string | null;
  OrderId?: string | null;
  Success?: unknown;
}

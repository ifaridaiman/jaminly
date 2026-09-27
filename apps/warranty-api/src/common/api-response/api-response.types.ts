export interface ApiMeta {
  requestId: string;
  timestamp: string; // ISO 8601 UTC
  version: string; // "v1"
}

export interface ApiError {
  field?: string; // dotted path: "coverage.covered[2]", "proofOfPurchase[0].id"
  code: string; // SCREAMING_SNAKE_CASE
  message: string;
  details?: Record<string, unknown>; // safe, client-facing extras only
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  errors: ApiError[];
  meta: ApiMeta;
}

import type { ApiError } from '../api-response/api-response.types';
import type { ErrorKind } from './error-status';

/**
 * Services throw these; they never build HTTP responses.
 * `message` is shown to users as-is, so write it as a sentence. 5xx messages are replaced before sending.
 */
export abstract class AppError extends Error {
  abstract readonly kind: ErrorKind;

  constructor(
    readonly code: string,
    message: string,
    readonly errors: ApiError[] = [],
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  readonly kind = 'BAD_REQUEST';
}
export class ValidationError extends AppError {
  readonly kind = 'VALIDATION';
}
export class AuthenticationError extends AppError {
  readonly kind = 'AUTHENTICATION';
}
export class AuthorizationError extends AppError {
  readonly kind = 'AUTHORIZATION';
}
export class NotFoundError extends AppError {
  readonly kind = 'NOT_FOUND';
}
export class ConflictError extends AppError {
  readonly kind = 'CONFLICT';
}
export class BusinessRuleError extends AppError {
  readonly kind = 'BUSINESS_RULE';
}
export class RateLimitError extends AppError {
  readonly kind = 'RATE_LIMIT';
}
export class ExternalServiceError extends AppError {
  readonly kind = 'EXTERNAL_SERVICE';
}
export class ServiceUnavailableError extends AppError {
  readonly kind = 'SERVICE_UNAVAILABLE';
}
export class DatabaseError extends AppError {
  readonly kind = 'DATABASE';
}
export class InternalServerError extends AppError {
  readonly kind = 'INTERNAL';
}

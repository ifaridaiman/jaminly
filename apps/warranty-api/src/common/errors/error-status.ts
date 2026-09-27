import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export type ErrorKind =
  | 'BAD_REQUEST'
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'RATE_LIMIT'
  | 'EXTERNAL_SERVICE'
  | 'SERVICE_UNAVAILABLE'
  | 'DATABASE'
  | 'INTERNAL';

/** The one place that maps error kinds to HTTP. Change a status here, nowhere else. */
export const ERROR_STATUS: Record<ErrorKind, HttpStatus> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  VALIDATION: HttpStatus.UNPROCESSABLE_ENTITY,
  AUTHENTICATION: HttpStatus.UNAUTHORIZED,
  AUTHORIZATION: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  BUSINESS_RULE: HttpStatus.UNPROCESSABLE_ENTITY,
  RATE_LIMIT: HttpStatus.TOO_MANY_REQUESTS,
  EXTERNAL_SERVICE: HttpStatus.BAD_GATEWAY,
  SERVICE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  DATABASE: HttpStatus.INTERNAL_SERVER_ERROR,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Default code + message per HTTP status, for errors that aren't AppErrors (Nest, throttler, body parser). */
export const STATUS_DEFAULTS: Record<
  number,
  { code: string; message: string }
> = {
  400: {
    code: ErrorCode.BAD_REQUEST,
    message: 'The request could not be read.',
  },
  401: { code: ErrorCode.UNAUTHORIZED, message: 'Please sign in again.' },
  403: { code: ErrorCode.FORBIDDEN, message: "You don't have access to this." },
  404: { code: ErrorCode.RESOURCE_NOT_FOUND, message: 'Not found.' },
  409: {
    code: ErrorCode.CONFLICT,
    message: 'This conflicts with existing data.',
  },
  422: {
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Some fields need fixing.',
  },
  429: {
    code: ErrorCode.RATE_LIMITED,
    message: 'Too many requests. Please wait a moment and try again.',
  },
  502: { code: ErrorCode.SERVICE_UNAVAILABLE, message: '' },
  503: { code: ErrorCode.SERVICE_UNAVAILABLE, message: '' },
  500: { code: ErrorCode.INTERNAL_ERROR, message: '' }, // 5xx messages are replaced with the generic one
};

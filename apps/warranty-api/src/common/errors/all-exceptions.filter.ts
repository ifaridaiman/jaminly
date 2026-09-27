import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponseBuilder } from '../api-response/api-response.builder';
import type { ApiError } from '../api-response/api-response.types';
import { getRequestContext } from '../request-context/request-context';
import { AppError } from './app-error';
import { ERROR_STATUS, STATUS_DEFAULTS } from './error-status';

type Resolved = {
  status: number;
  code: string;
  message: string;
  errors: ApiError[];
};

/** Anything thrown anywhere → the error envelope. Clients only ever see messages we wrote. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, code, message, errors } = resolve(exception);
    const { requestId } = getRequestContext();

    if (status >= 500) {
      // Full detail goes to the log only, tied to the request id the client sees.
      this.logger.error(
        { requestId, code, err: describe(exception) },
        (exception as Error)?.stack,
      );
    }

    const body = ApiResponseBuilder.failure(
      code,
      status >= 500
        ? `Something went wrong. Please try again. Reference: ${requestId}`
        : message,
      status >= 500 ? [] : errors,
    );
    res.status(status).json(body);
  }
}

export function resolve(exception: unknown): Resolved {
  if (exception instanceof AppError) {
    return {
      status: ERROR_STATUS[exception.kind],
      code: exception.code,
      message: exception.message,
      errors: exception.errors,
    };
  }

  // Prisma, duck-typed so common/ never imports the Prisma client.
  const prismaCode =
    (exception as { name?: string; code?: string })?.name ===
    'PrismaClientKnownRequestError'
      ? (exception as { code: string }).code
      : undefined;
  if (prismaCode === 'P2025') return byStatus(404);
  if (prismaCode === 'P2002') return byStatus(409);
  if ((exception as { name?: string })?.name?.startsWith('PrismaClient'))
    return byStatus(500);

  // Nest HttpExceptions (throttler, unmatched route, pipes) and body-parser errors carry a status.
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : Number((exception as { status?: unknown })?.status) || 500;
  return byStatus(status);
}

function byStatus(status: number): Resolved {
  const known = STATUS_DEFAULTS[status];
  if (known) return { status, ...known, errors: [] };
  // Unlisted statuses (405, 413, …) keep their status with the nearest default code.
  return status >= 500
    ? { status: 500, ...STATUS_DEFAULTS[500], errors: [] }
    : { status, ...STATUS_DEFAULTS[400], errors: [] };
}

function describe(exception: unknown) {
  if (exception instanceof Error)
    return { name: exception.name, message: exception.message };
  return { value: String(exception) };
}

import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { map } from 'rxjs';
import { ApiResponseBuilder } from './api-response.builder';
import { API_RESULT, type ApiResultMeta } from './api-result.decorator';

/** Wraps every controller return value in the success envelope. 204 responses stay bodyless. */
@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    // A test asserts every handler has @ApiResult; the fallback only keeps a missed one from crashing.
    const meta = this.reflector.get<ApiResultMeta | undefined>(
      API_RESULT,
      context.getHandler(),
    ) ?? {
      code: 'OK',
      message: 'OK',
    };
    const res = context.switchToHttp().getResponse<Response>();

    return next
      .handle()
      .pipe(
        map((data: unknown) =>
          res.statusCode === Number(HttpStatus.NO_CONTENT)
            ? undefined
            : ApiResponseBuilder.success(meta.code, meta.message, data ?? null),
        ),
      );
  }
}

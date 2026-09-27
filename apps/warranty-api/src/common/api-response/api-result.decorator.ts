import {
  applyDecorators,
  HttpCode,
  HttpStatus,
  SetMetadata,
  type Type,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { STATUS_DEFAULTS } from '../errors/error-status';

export const API_RESULT = 'api-result';
export type ApiResultMeta = { code: string; message: string };

// ── Swagger-only classes describing the envelope ──

class ApiMetaDto {
  @ApiProperty({ example: 'req_5f0c2b1e-…' }) requestId!: string;
  @ApiProperty({ example: '2026-09-26T18:10:00.000Z' }) timestamp!: string;
  @ApiProperty({ example: 'v1' }) version!: string;
}

class ApiErrorDto {
  @ApiProperty({ required: false, example: 'coverage.covered[2]' })
  field?: string;
  @ApiProperty({ example: 'TOO_LONG' }) code!: string;
  @ApiProperty({ example: 'Must be 100 characters or fewer.' })
  message!: string;
  @ApiProperty({ required: false, type: Object, additionalProperties: true })
  details?: Record<string, unknown>;
}

class ApiEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ type: [ApiErrorDto] }) errors!: ApiErrorDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

const errorSchema = (status: number) => ({
  allOf: [
    { $ref: getSchemaPath(ApiEnvelopeDto) },
    {
      properties: {
        success: { example: false },
        code: { example: STATUS_DEFAULTS[status]?.code ?? 'BAD_REQUEST' },
        message: {
          example:
            STATUS_DEFAULTS[status]?.message ||
            'Something went wrong. Please try again. Reference: req_…',
        },
        data: { nullable: true, example: null },
      },
    },
  ],
});

/**
 * Declares an endpoint's success code, message and status. The global interceptor wraps the
 * handler's return value in the envelope; Swagger gets the same schema, so docs can't drift.
 * Every endpoint documents 429 and 500 because every endpoint can return them.
 */
export function ApiResult(opts: {
  code: string;
  message: string;
  type?: Type;
  isArray?: boolean;
  status?: HttpStatus;
  /** Swagger summary. The CLI plugin is off for controllers (it can't see this decorator). */
  summary?: string;
}) {
  const status = opts.status ?? HttpStatus.OK;
  const decorators: (ClassDecorator | MethodDecorator)[] = [
    SetMetadata(API_RESULT, {
      code: opts.code,
      message: opts.message,
    } satisfies ApiResultMeta),
  ];
  // Always set, so a POST without `status` returns the documented 200, not Nest's default 201.
  decorators.push(HttpCode(status));
  if (opts.summary) decorators.push(ApiOperation({ summary: opts.summary }));

  if (status === HttpStatus.NO_CONTENT) {
    decorators.push(ApiResponse({ status, description: opts.message }));
  } else {
    const ref = opts.type
      ? { $ref: getSchemaPath(opts.type) }
      : { type: 'object', nullable: true };
    decorators.push(
      ApiExtraModels(ApiEnvelopeDto, ...(opts.type ? [opts.type] : [])),
      ApiResponse({
        status,
        description: opts.message,
        schema: {
          allOf: [
            { $ref: getSchemaPath(ApiEnvelopeDto) },
            {
              properties: {
                success: { example: true },
                code: { example: opts.code },
                message: { example: opts.message },
                data: opts.isArray ? { type: 'array', items: ref } : ref,
              },
            },
          ],
        },
      }),
    );
  }
  return applyDecorators(...decorators, ApiErrors(429, 500));
}

/** Documents the error envelope for the given statuses. */
export function ApiErrors(...statuses: number[]) {
  return applyDecorators(
    ApiExtraModels(ApiEnvelopeDto),
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: STATUS_DEFAULTS[status]?.code,
        schema: errorSchema(status),
      }),
    ),
  );
}

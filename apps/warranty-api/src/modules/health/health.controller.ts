import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ServiceUnavailableError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiResult({ code: 'HEALTHY', message: 'Service is healthy.' })
  @ApiErrors(503)
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (cause) {
      throw new ServiceUnavailableError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Database unreachable.',
        [],
        { cause },
      );
    }
    return { database: 'up' };
  }
}

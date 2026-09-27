import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DEFAULT_VERSION,
  newId,
  runWithContext,
} from '../../common/request-context/request-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Hourly: expired refresh tokens. Revoked ones stay until they expire: they detect stolen-token reuse. */
@Injectable()
export class AuthCleanup {
  private readonly logger = new Logger(AuthCleanup.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  cron() {
    return runWithContext(
      { requestId: newId('job'), version: DEFAULT_VERSION },
      () =>
        this.run().catch((err: unknown) =>
          this.logger.error({ err: String(err) }, 'Auth cleanup failed'),
        ),
    );
  }

  async run(now = new Date()) {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    if (count) this.logger.log({ count }, 'Removed expired refresh tokens');
    return count;
  }
}

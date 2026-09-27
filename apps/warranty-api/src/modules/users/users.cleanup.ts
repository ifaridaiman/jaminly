import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DEFAULT_VERSION,
  newId,
  runWithContext,
} from '../../common/request-context/request-context';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const UNVERIFIED_TTL_MS = 7 * 24 * 60 * 60_000;

/** Hourly: expired email codes, and password sign-ups nobody verified within 7 days. */
@Injectable()
export class UsersCleanup {
  private readonly logger = new Logger(UsersCleanup.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  cron() {
    return runWithContext(
      { requestId: newId('job'), version: DEFAULT_VERSION },
      () =>
        this.run().catch((err: unknown) =>
          this.logger.error({ err: String(err) }, 'Users cleanup failed'),
        ),
    );
  }

  async run(now = new Date()) {
    const codes = await this.prisma.emailCode.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    // Never verified = never signed in = owns nothing, so there are no files to delete.
    const accounts = await this.prisma.user.deleteMany({
      where: {
        emailVerifiedAt: null,
        googleSub: null,
        createdAt: { lt: new Date(now.getTime() - UNVERIFIED_TTL_MS) },
      },
    });
    if (codes.count || accounts.count)
      this.logger.log(
        { codes: codes.count, unverifiedAccounts: accounts.count },
        'Users cleanup',
      );
    return { codes: codes.count, unverifiedAccounts: accounts.count };
  }
}

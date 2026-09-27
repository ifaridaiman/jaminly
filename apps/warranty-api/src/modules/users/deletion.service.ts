import { Injectable, Logger } from '@nestjs/common';
import { RateLimitError } from '../../common/errors/app-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { EmailCodesService, RESEND_AFTER_SECONDS } from './email-codes.service';
import { UsersCode } from './users.codes';
import type { DeletionRequestedDto } from './users.dto';
import { UsersService } from './users.service';

/** Account deletion with an emailed one-time code (PRD §4.6, ARCHITECTURE §8). */
@Injectable()
export class DeletionService {
  private readonly logger = new Logger(DeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly codes: EmailCodesService,
    private readonly storage: StorageService,
  ) {}

  async request(userId: string): Promise<DeletionRequestedDto> {
    const user = await this.users.getById(userId);
    const result = await this.codes.issue(user, 'DELETE_ACCOUNT');
    if (!result.sent) {
      const message = `Please wait ${result.waitSeconds} seconds before requesting another code.`;
      throw new RateLimitError(UsersCode.DELETION_CODE_RECENTLY_SENT, message, [
        {
          code: UsersCode.DELETION_CODE_RECENTLY_SENT,
          message,
          details: { resendAfterSeconds: result.waitSeconds },
        },
      ]);
    }
    return { email: user.email, resendAfterSeconds: RESEND_AFTER_SECONDS };
  }

  async confirm(userId: string, code: string): Promise<void> {
    await this.codes.consume(userId, 'DELETE_ACCOUNT', code);

    // Cascade removes everything the user owns in the DB. Files go after the commit (ARCHITECTURE §6).
    await this.prisma.user.delete({ where: { id: userId } });
    await this.storage.deletePrefix(`users/${userId}/`).catch((err: unknown) =>
      // ponytail: logged only; the M2 attachments cleanup cron sweeps orphaned prefixes.
      this.logger.error(
        { userId, err: String(err) },
        'Account deleted but file cleanup failed',
      ),
    );
  }
}

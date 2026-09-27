import { Injectable } from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { BusinessRuleError } from '../../common/errors/app-error';
import type { EmailCodePurpose } from '../../generated/prisma/client';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsersCode } from './users.codes';

export const RESEND_AFTER_SECONDS = 30;
export const CODE_TTL_MS = 15 * 60_000;
export const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash('sha256').update(code).digest();

const INVALID_MESSAGE =
  "That code isn't right. Check the email or send a new one.";
const EXPIRED_MESSAGE = 'This code has expired. Send a new one.';

/** Per purpose: the email we send and the error codes the UI branches on. */
const PURPOSES: Record<
  EmailCodePurpose,
  { subject: string; body: string[]; invalid: string; expired: string }
> = {
  VERIFY_EMAIL: {
    subject: 'Your Jaminly verification code',
    body: [
      'Enter it in Jaminly to finish creating your account.',
      "If you didn't sign up, ignore this email.",
    ],
    invalid: UsersCode.CODE_INVALID,
    expired: UsersCode.CODE_EXPIRED,
  },
  RESET_PASSWORD: {
    subject: 'Your Jaminly password reset code',
    body: [
      'Enter it in Jaminly to choose a new password. Other devices will be signed out.',
      "If you didn't ask for this, ignore this email; your password won't change.",
    ],
    invalid: UsersCode.CODE_INVALID,
    expired: UsersCode.CODE_EXPIRED,
  },
  DELETE_ACCOUNT: {
    subject: 'Your Jaminly account deletion code',
    body: [
      'Entering it deletes your Jaminly account and all your warranties and receipts. This cannot be undone.',
      "If you didn't ask for this, ignore this email; nothing will be deleted.",
    ],
    invalid: UsersCode.DELETION_CODE_INVALID,
    expired: UsersCode.DELETION_CODE_EXPIRED,
  },
};

export type IssueResult = { sent: true } | { sent: false; waitSeconds: number };

/**
 * Emailed 6-digit codes for verifying an email, resetting a password and deleting an account.
 * Stored hashed, one live code per (user, purpose), 15 min, 5 wrong attempts, 30 s between sends.
 */
@Injectable()
export class EmailCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Sends a fresh code unless one went out less than 30 s ago. */
  async issue(
    user: { id: string; email: string },
    purpose: EmailCodePurpose,
  ): Promise<IssueResult> {
    const key = { userId_purpose: { userId: user.id, purpose } };
    const existing = await this.prisma.emailCode.findUnique({ where: key });
    if (existing) {
      const wait =
        RESEND_AFTER_SECONDS -
        Math.floor((Date.now() - existing.sentAt.getTime()) / 1000);
      if (wait > 0) return { sent: false, waitSeconds: wait };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const row = {
      codeHash: hash(code).toString('hex'),
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      sentAt: new Date(),
    };
    await this.prisma.emailCode.upsert({
      where: key,
      create: { userId: user.id, purpose, ...row },
      update: row,
    });

    const { subject, body } = PURPOSES[purpose];
    try {
      await this.mail.send({
        to: user.email,
        subject,
        text: [
          `Your code is ${code}. It expires in 15 minutes.`,
          '',
          ...body,
        ].join('\n'),
      });
    } catch (err) {
      // Don't leave a code the user never received blocking resends.
      await this.prisma.emailCode.delete({ where: key }).catch(() => undefined);
      throw err;
    }
    return { sent: true };
  }

  /**
   * Checks and consumes the code. Throws the purpose's INVALID/EXPIRED error otherwise.
   * `userId: null` (unknown email on a public endpoint) fails like a wrong code, so it doesn't reveal accounts.
   */
  async consume(
    userId: string | null,
    purpose: EmailCodePurpose,
    input: string,
  ): Promise<void> {
    const { invalid, expired } = PURPOSES[purpose];
    if (!userId) throw new BusinessRuleError(invalid, INVALID_MESSAGE);

    const key = { userId_purpose: { userId, purpose } };
    const row = await this.prisma.emailCode.findUnique({ where: key });
    if (
      !row ||
      row.expiresAt.getTime() < Date.now() ||
      row.attempts >= MAX_ATTEMPTS
    )
      throw new BusinessRuleError(expired, EXPIRED_MESSAGE);

    const code = input.replace(/\s/g, ''); // "123 456" pasted from the email
    if (!timingSafeEqual(hash(code), Buffer.from(row.codeHash, 'hex'))) {
      await this.prisma.emailCode.update({
        where: key,
        data: { attempts: { increment: 1 } },
      });
      throw new BusinessRuleError(invalid, INVALID_MESSAGE);
    }
    await this.prisma.emailCode.delete({ where: key });
  }
}

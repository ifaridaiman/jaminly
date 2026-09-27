import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuthenticationError } from '../../common/errors/app-error';
import { GoogleVerifierService } from '../../infrastructure/google/google-verifier.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import {
  EmailCodesService,
  normalizeEmail,
  RESEND_AFTER_SECONDS,
  UsersService,
  verifyAgainstDummy,
  verifyPassword,
} from '../users';
import { AuthCode } from './auth.codes';
import type { AuthTokensDto, CodeSentDto } from './auth.dto';

const REFRESH_TTL_MS = 60 * 24 * 60 * 60_000; // 60 days
const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const invalidRefresh = () =>
  new AuthenticationError(
    AuthCode.INVALID_REFRESH_TOKEN,
    'Please sign in again.',
  );

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly google: GoogleVerifierService,
    private readonly users: UsersService,
    private readonly codes: EmailCodesService,
  ) {}

  async signInWithGoogle(idToken: string): Promise<AuthTokensDto> {
    const profile = await this.google.verify(idToken);
    if (!profile)
      throw new AuthenticationError(
        AuthCode.INVALID_GOOGLE_TOKEN,
        'Google sign-in failed. Please try again.',
      );
    if (!profile.emailVerified)
      throw new AuthenticationError(
        AuthCode.EMAIL_NOT_VERIFIED,
        'Verify your Google email address, then try again.',
      );

    return this.startSession(await this.users.upsertFromGoogle(profile));
  }

  /** Creates (or refreshes an unverified) account and emails a verification code. No tokens until verified. */
  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<CodeSentDto> {
    const user = await this.users.registerWithPassword(input);
    await this.codes.issue(user, 'VERIFY_EMAIL'); // within 30 s of the last send: no new email, same answer
    return { email: user.email, resendAfterSeconds: RESEND_AFTER_SECONDS };
  }

  /** Same answer whether or not the email has a pending account, so it can't be used to probe emails. */
  async resendVerification(email: string): Promise<CodeSentDto> {
    const user = await this.users.findByEmail(email);
    if (user?.passwordHash && !user.emailVerifiedAt)
      await this.codes.issue(user, 'VERIFY_EMAIL');
    return {
      email: normalizeEmail(email),
      resendAfterSeconds: RESEND_AFTER_SECONDS,
    };
  }

  async verifyEmail(email: string, code: string): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(email);
    const pending = user && !user.emailVerifiedAt ? user : null;
    await this.codes.consume(pending?.id ?? null, 'VERIFY_EMAIL', code);
    return this.startSession(await this.users.markEmailVerified(pending!.id));
  }

  /**
   * Unknown email, Google-only account and wrong password all get the same error in the same time.
   * The right password on an unverified account sends a fresh code and says so.
   */
  async login(email: string, password: string): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(email);
    const ok = user?.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : await verifyAgainstDummy(password);
    if (!user || !ok)
      throw new AuthenticationError(
        AuthCode.INVALID_CREDENTIALS,
        'Email or password is incorrect.',
      );
    if (!user.emailVerifiedAt) {
      await this.codes.issue(user, 'VERIFY_EMAIL');
      throw new AuthenticationError(
        AuthCode.EMAIL_NOT_VERIFIED,
        'Verify your email to continue. We sent you a code.',
      );
    }
    return this.startSession(user);
  }

  /** Always "sent", so it can't be used to probe emails. Google-only accounts can use it to add a password. */
  async forgotPassword(email: string): Promise<CodeSentDto> {
    const user = await this.users.findByEmail(email);
    if (user) await this.codes.issue(user, 'RESET_PASSWORD');
    return {
      email: normalizeEmail(email),
      resendAfterSeconds: RESEND_AFTER_SECONDS,
    };
  }

  /** New password, signs out every other session, and signs this device in. */
  async resetPassword(
    email: string,
    code: string,
    password: string,
  ): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(email);
    await this.codes.consume(user?.id ?? null, 'RESET_PASSWORD', code);
    const updated = await this.users.setPassword(user!, password);
    await this.prisma.refreshToken.updateMany({
      where: { userId: updated.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.startSession(updated);
  }

  private async startSession(user: User): Promise<AuthTokensDto> {
    return {
      ...(await this.issue(user.id, randomUUID())),
      user: this.users.toDto(user),
    };
  }

  /** Rotates the refresh token. Presenting an already-used token revokes its whole family (stolen-token defence). */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash(refreshToken) },
    });
    if (!row) throw invalidRefresh();
    if (row.revokedAt) {
      await this.revokeFamily(row.family);
      throw invalidRefresh();
    }
    if (row.expiresAt.getTime() < Date.now()) throw invalidRefresh();

    // Only one caller can claim the token; a concurrent loser is treated as reuse.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeFamily(row.family);
      throw invalidRefresh();
    }

    const user = await this.users.getById(row.userId);
    return {
      ...(await this.issue(user.id, row.family)),
      user: this.users.toDto(user),
    };
  }

  /** Idempotent: an unknown or already-revoked token is not an error. */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(userId: string, family: string) {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        family,
        tokenHash: hash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId });
    return { accessToken, refreshToken };
  }

  private revokeFamily(family: string) {
    return this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

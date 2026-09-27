import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  ConflictError,
} from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import type { User } from '../../generated/prisma/client';
import type { GoogleProfile } from '../../infrastructure/google/google-verifier.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { hashPassword } from './password';
import { UsersCode } from './users.codes';
import type { UserDto } from './users.dto';

/** Emails are compared and stored lower-cased and trimmed. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Google sign-in. Matches by Google `sub` first, then by email:
   * - an existing email/password account gets Google linked (Google has verified the email);
   *   if that account was never verified, its password is dropped, locking out whoever typed
   *   someone else's email at sign-up.
   * - otherwise a new, already-verified account is created.
   */
  async upsertFromGoogle(p: GoogleProfile): Promise<User> {
    const bySub = await this.prisma.user.findUnique({
      where: { googleSub: p.sub },
    });
    if (bySub)
      return this.prisma.user.update({
        where: { id: bySub.id },
        data: { name: p.name, avatarUrl: p.picture ?? null },
      });

    const email = normalizeEmail(p.email);
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail)
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: p.sub,
          avatarUrl: byEmail.avatarUrl ?? p.picture ?? null,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          ...(!byEmail.emailVerifiedAt && { passwordHash: null }),
        },
      });

    return this.prisma.user.create({
      data: {
        googleSub: p.sub,
        email,
        name: p.name,
        avatarUrl: p.picture ?? null,
        emailVerifiedAt: new Date(),
      },
    });
  }

  /**
   * Email sign-up. A verified account with this email → 409. An unverified one (nobody proved
   * the inbox, so nobody has used it) is taken over: new name and password, new code.
   */
  async registerWithPassword(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const email = normalizeEmail(input.email);
    const data = {
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
    };
    const existing = await this.findByEmail(email);
    if (existing?.emailVerifiedAt)
      throw new ConflictError(
        UsersCode.EMAIL_TAKEN,
        'An account with this email already exists. Sign in, or reset your password.',
      );
    if (existing)
      return this.prisma.user.update({ where: { id: existing.id }, data });
    return this.prisma.user.create({ data: { email, ...data } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** Setting a password via an emailed code also proves the inbox, so it verifies the email too. */
  async setPassword(user: User, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });
  }

  /** A valid token for a user that no longer exists is treated as signed out. */
  async getById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      throw new AuthenticationError(
        ErrorCode.UNAUTHORIZED,
        'Please sign in again.',
      );
    return user;
  }

  notificationSettings(u: User) {
    return {
      push: u.pushEnabled,
      email: u.emailEnabled,
      defaultReminders: u.defaultReminders,
      timezone: u.timezone,
    };
  }

  updateNotificationSettings(
    userId: string,
    s: {
      push: boolean;
      email: boolean;
      defaultReminders: number[];
      timezone: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        pushEnabled: s.push,
        emailEnabled: s.email,
        defaultReminders: s.defaultReminders,
        timezone: s.timezone,
      },
    });
  }

  toDto(u: User): UserDto {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      ...(u.avatarUrl && { avatarUrl: u.avatarUrl }),
    };
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  DEFAULT_VERSION,
  newId,
  runWithContext,
} from '../../common/request-context/request-context';
import { env } from '../../env';
import type { Prisma } from '../../generated/prisma/client';
import { MailService } from '../../infrastructure/mail/mail.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  PUSH_SENDER,
  type PushMessage,
  type PushSender,
} from '../../infrastructure/push/push-sender';
import { planReminders } from './schedule';

const BATCH = 500;
const CATCH_UP_MS = 24 * 60 * 60_000; // older than this after downtime: skip rather than send stale news

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

export function reminderTitle(productName: string, offsetDays: number) {
  if (offsetDays === 0) return `${productName} warranty ends today`;
  if (offsetDays === 1) return `${productName} warranty ends tomorrow`;
  return `${productName} warranty ends in ${offsetDays} days`;
}

type Claimed = {
  id: string;
  warrantyId: string;
  offsetDays: number;
  sendAt: Date;
};

/** Plans one Reminder row per offset and sends due ones (ARCHITECTURE §7). */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(PUSH_SENDER) private readonly push: PushSender,
  ) {}

  /** Replaces a warranty's unsent reminders. Call inside the warranty's save transaction. */
  async plan(
    tx: Prisma.TransactionClient,
    warranty: { id: string; expiryDate: Date; reminderOffsetsDays: number[] },
    timeZone: string,
  ): Promise<void> {
    await tx.reminder.deleteMany({
      where: { warrantyId: warranty.id, sentAt: null },
    });
    const rows = planReminders(
      ymd(warranty.expiryDate),
      warranty.reminderOffsetsDays,
      timeZone,
    ).map((r) => ({
      warrantyId: warranty.id,
      offsetDays: r.offsetDays,
      expiryDate: warranty.expiryDate,
      sendAt: r.sendAt,
    }));
    // skipDuplicates: an already-sent (warranty, offset, expiry) is never re-created.
    if (rows.length)
      await tx.reminder.createMany({ data: rows, skipDuplicates: true });
  }

  /** After a timezone change: re-plan every warranty of the user. */
  async replanUser(userId: string, timeZone: string): Promise<void> {
    const warranties = await this.prisma.warranty.findMany({
      where: { userId },
      select: { id: true, expiryDate: true, reminderOffsetsDays: true },
    });
    for (const w of warranties)
      await this.prisma.$transaction((tx) => this.plan(tx, w, timeZone));
  }

  @Cron('*/15 * * * *')
  sendDueCron() {
    return runWithContext(
      { requestId: newId('job'), version: DEFAULT_VERSION },
      () =>
        this.sendDue().catch((err: unknown) =>
          this.logger.error({ err: String(err) }, 'Reminder run failed'),
        ),
    );
  }

  /**
   * Claims due reminders by setting sentAt in one statement (FOR UPDATE SKIP LOCKED), then sends.
   * Claim-then-send means at most once: a crash mid-send loses that reminder rather than doubling it.
   * Returns how many were delivered to at least one channel.
   */
  async sendDue(now = new Date()): Promise<number> {
    let delivered = 0;
    for (let round = 0; round < 20; round++) {
      const claimed = await this.prisma.$queryRaw<Claimed[]>`
        UPDATE "Reminder" SET "sentAt" = ${now}
        WHERE id IN (
          SELECT id FROM "Reminder"
          WHERE "sentAt" IS NULL AND "sendAt" <= ${now}
          ORDER BY "sendAt" LIMIT ${BATCH}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, "warrantyId", "offsetDays", "sendAt"`;
      if (!claimed.length) break;
      delivered += await this.deliver(
        claimed.filter(
          (r) => now.getTime() - r.sendAt.getTime() <= CATCH_UP_MS,
        ),
      );
      if (claimed.length < BATCH) break;
    }
    return delivered;
  }

  private async deliver(reminders: Claimed[]): Promise<number> {
    if (!reminders.length) return 0;
    const warranties = await this.prisma.warranty.findMany({
      where: { id: { in: [...new Set(reminders.map((r) => r.warrantyId))] } },
      include: {
        user: {
          include: { pushTokens: { where: { provider: env.PUSH_PROVIDER } } },
        },
      },
    });
    const byId = new Map(warranties.map((w) => [w.id, w]));

    const pushes: PushMessage[] = [];
    let delivered = 0;
    for (const r of reminders) {
      const w = byId.get(r.warrantyId);
      if (!w) continue; // deleted between claim and now
      const title = reminderTitle(w.productName, r.offsetDays);
      const url = `jaminly://warranty/${w.id}`;
      let sent = false;

      if (w.user.pushEnabled && w.user.pushTokens.length) {
        for (const t of w.user.pushTokens)
          pushes.push({
            token: t.token,
            title,
            body: "Tap to see what's covered.",
            url,
          });
        sent = true;
      }
      if (w.user.emailEnabled) {
        try {
          await this.mail.send(this.email(w, title));
          sent = true;
        } catch (err) {
          this.logger.error(
            { reminderId: r.id, err: String(err) },
            'Reminder email failed',
          ); // no retry storms
        }
      }
      if (sent) delivered++;
    }

    if (pushes.length) {
      const { invalidTokens } = await this.push.send(pushes);
      if (invalidTokens.length)
        await this.prisma.pushToken.deleteMany({
          where: { token: { in: invalidTokens } },
        });
    }
    return delivered;
  }

  private email(
    w: {
      id: string;
      productName: string;
      expiryDate: Date;
      covered: string[];
      notCovered: string[];
      user: { email: string };
    },
    title: string,
  ) {
    const expiry = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(w.expiryDate);
    const link = `${env.WEB_APP_URL}/warranty/${w.id}`;
    const covered = w.covered.length ? w.covered : ['(not recorded)'];
    const text = [
      `${title}.`,
      '',
      `Expires: ${expiry}`,
      `Covered: ${covered.join(', ')}`,
      ...(w.notCovered.length
        ? [`Not covered: ${w.notCovered.join(', ')}`]
        : []),
      '',
      `See the warranty and receipt: ${link}`,
      '',
      'You get these because email reminders are on in Jaminly settings.',
    ].join('\n');
    const html = `<p><strong>${escapeHtml(title)}.</strong></p>
<p>Expires: ${escapeHtml(expiry)}<br>Covered: ${escapeHtml(covered.join(', '))}${
      w.notCovered.length
        ? `<br>Not covered: ${escapeHtml(w.notCovered.join(', '))}`
        : ''
    }</p>
<p><a href="${escapeHtml(link)}">See the warranty and receipt</a></p>
<p style="color:#60646C;font-size:12px">You get these because email reminders are on in Jaminly settings.</p>`;
    return { to: w.user.email, subject: title, text, html };
  }
}

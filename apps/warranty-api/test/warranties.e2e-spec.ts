import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { env } from '../src/env';
import {
  MailService,
  type Mail,
} from '../src/infrastructure/mail/mail.service';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import {
  PUSH_SENDER,
  type PushMessage,
} from '../src/infrastructure/push/push-sender';
import { AttachmentsService } from '../src/modules/attachments';
import { RemindersService } from '../src/modules/notifications';
import { UsersCleanup } from '../src/modules/users/users.cleanup';

// Real Postgres and RustFS; fake mail and push so we can read what would have been sent.
const sentMail: Mail[] = [];
const fakeMail = { send: (m: Mail) => (sentMail.push(m), Promise.resolve()) };
const pushed: PushMessage[] = [];
let deadTokens: string[] = [];
const fakePush = {
  send: (m: PushMessage[]) => (
    pushed.push(...m),
    Promise.resolve({ invalidTokens: deadTokens })
  ),
};

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});
const objectExists = (key: string) =>
  s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key })).then(
    () => true,
    () => false,
  );

const DAY = 86_400_000;
const ymd = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
const RECEIPT = Buffer.from('%PDF-1.4 test receipt');

describe('warranties + uploads + notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
  const http = () => request(app.getHttpServer());
  const userIds: string[] = [];

  /** A verified user and a bearer header, without going through sign-up. */
  async function newUser(
    data: { timezone?: string; emailEnabled?: boolean } = {},
  ) {
    const user = await prisma.user.create({
      data: {
        email: `w-${randomUUID()}@example.com`,
        name: 'W',
        emailVerifiedAt: new Date(),
        ...data,
      },
    });
    userIds.push(user.id);
    return {
      id: user.id,
      email: user.email,
      auth: { authorization: `Bearer ${jwt.sign({ sub: user.id })}` },
    };
  }
  type U = Awaited<ReturnType<typeof newUser>>;

  /** POST /uploads, then PUT the bytes to the presigned URL the way the app does. */
  async function upload(u: U, bytes = RECEIPT, mimeType = 'application/pdf') {
    const res = await http()
      .post('/api/v1/uploads')
      .set(u.auth)
      .send({ mimeType, sizeBytes: bytes.length, name: 'receipt.pdf' })
      .expect(201);
    const { attachment, uploadUrl, headers } = res.body.data;
    // A checksum signed in at presign time would be of an empty body; S3/R2 would reject the upload.
    expect(uploadUrl).not.toMatch(/x-amz-checksum/i);
    const put = await fetch(uploadUrl, { method: 'PUT', headers, body: bytes });
    expect(put.status).toBe(200);
    return attachment as { id: string; url: string };
  }

  const warrantyBody = (
    proofIds: string[],
    overrides: Record<string, unknown> = {},
  ) => ({
    productName: 'Samsung 55" QLED TV',
    brand: 'Samsung',
    category: 'electronics',
    purchaseDate: '2026-01-31',
    warrantyMonths: 1,
    coverage: { covered: ['Parts', 'Labour'], notCovered: ['Water damage'] },
    proofOfPurchase: proofIds.map((id) => ({ id })),
    ...overrides,
  });

  async function createWarranty(u: U, overrides: Record<string, unknown> = {}) {
    const a = await upload(u);
    const res = await http()
      .post('/api/v1/warranties')
      .set(u.auth)
      .send(warrantyBody([a.id], overrides))
      .expect(201);
    return res.body.data as {
      id: string;
      proofOfPurchase: { id: string }[];
      expiryDate: string;
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(fakeMail)
      .overrideProvider(PUSH_SENDER)
      .useValue(fakePush)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService, { strict: false });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  describe('create → read', () => {
    it('upload, save, and GET returns exactly the UI Warranty shape', async () => {
      const u = await newUser();
      const a = await upload(u);
      const res = await http()
        .post('/api/v1/warranties')
        .set(u.auth)
        .send(
          warrantyBody([a.id], {
            store: 'Harvey Norman',
            price: { amount: 2999.5, currency: 'MYR' },
            coverage: {
              covered: ['Parts'],
              notCovered: [],
              notes: 'Keep the box.',
            },
            reminderOffsetsDays: [7, 30, 7],
          }),
        )
        .expect(201);
      expect(res.body.code).toBe('WARRANTY_CREATED');
      const w = res.body.data;
      expect(w).toEqual({
        id: expect.any(String),
        productName: 'Samsung 55" QLED TV',
        brand: 'Samsung',
        category: 'electronics',
        store: 'Harvey Norman',
        purchaseDate: '2026-01-31',
        price: { amount: 2999.5, currency: 'MYR' },
        warrantyMonths: 1,
        expiryDate: '2026-02-28', // month-end clamp, computed by the server
        coverage: {
          covered: ['Parts'],
          notCovered: [],
          notes: 'Keep the box.',
        },
        proofOfPurchase: [
          {
            id: a.id,
            url: expect.stringContaining('X-Amz-Signature'),
            mimeType: 'application/pdf',
            sizeBytes: RECEIPT.length,
            name: 'receipt.pdf',
          },
        ],
        reminderOffsetsDays: [30, 7], // deduped, newest-first
        createdAt: expect.stringMatching(/Z$/),
        updatedAt: expect.stringMatching(/Z$/),
      });
      // No nulls anywhere: optional fields are omitted.
      expect(JSON.stringify(w)).not.toContain('null');

      const got = await http()
        .get(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .expect(200);
      expect({ ...got.body.data, proofOfPurchase: [] }).toEqual({
        ...w,
        proofOfPurchase: [],
      });
      const file = await fetch(got.body.data.proofOfPurchase[0].url);
      expect(Buffer.from(await file.arrayBuffer())).toEqual(RECEIPT);
    });

    it('uses the user default reminders when omitted, [] turns them off', async () => {
      const u = await newUser();
      await prisma.user.update({
        where: { id: u.id },
        data: { defaultReminders: [14, 1] },
      });
      expect((await createWarranty(u)).id).toBeDefined();
      const list = await http()
        .get('/api/v1/warranties')
        .set(u.auth)
        .expect(200);
      expect(list.body.data[0].reminderOffsetsDays).toEqual([14, 1]);
      const off = await createWarranty(u, { reminderOffsetsDays: [] });
      expect(
        await prisma.reminder.count({ where: { warrantyId: off.id } }),
      ).toBe(0);
    });

    it('lists soonest expiry first', async () => {
      const u = await newUser();
      await createWarranty(u, {
        productName: 'Later',
        expiryDate: '2030-01-01',
      });
      await createWarranty(u, {
        productName: 'Sooner',
        expiryDate: '2027-01-01',
      });
      const res = await http()
        .get('/api/v1/warranties')
        .set(u.auth)
        .expect(200);
      expect(
        (res.body.data as { productName: string }[]).map((w) => w.productName),
      ).toEqual(['Sooner', 'Later']);
    });
  });

  describe('validation', () => {
    it('one error per field with the UI wording', async () => {
      const u = await newUser();
      const res = await http()
        .post('/api/v1/warranties')
        .set(u.auth)
        .send({
          productName: '  ',
          category: 'toys',
          purchaseDate: '2026-02-30',
          warrantyMonths: 0,
          coverage: { covered: ['x'.repeat(101)], notCovered: [] },
          proofOfPurchase: [],
        })
        .expect(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'productName',
            code: 'REQUIRED',
            message: 'Product name is required.',
          }),
          expect.objectContaining({
            field: 'category',
            code: 'INVALID_OPTION',
          }),
          expect.objectContaining({
            field: 'purchaseDate',
            code: 'INVALID_DATE',
          }),
          expect.objectContaining({
            field: 'warrantyMonths',
            code: 'OUT_OF_RANGE',
          }),
          expect.objectContaining({
            field: 'coverage.covered',
            code: 'TOO_LONG',
          }),
          expect.objectContaining({
            field: 'proofOfPurchase',
            code: 'TOO_FEW_ITEMS',
            message: 'Add a proof of purchase to save.',
          }),
        ]),
      );
    });

    it('expiry before purchase → 422', async () => {
      const u = await newUser();
      const a = await upload(u);
      const res = await http()
        .post('/api/v1/warranties')
        .set(u.auth)
        .send(warrantyBody([a.id], { expiryDate: '2025-12-31' }))
        .expect(422);
      expect(res.body.code).toBe('EXPIRY_BEFORE_PURCHASE');
    });

    it('rejects unknown, not-yet-uploaded and mismatched files, per index', async () => {
      const u = await newUser();
      const pending = (
        await http()
          .post('/api/v1/uploads')
          .set(u.auth)
          .send({ mimeType: 'image/jpeg', sizeBytes: 10 })
          .expect(201)
      ).body.data.attachment;
      const mismatched = (
        await http()
          .post('/api/v1/uploads')
          .set(u.auth)
          .send({ mimeType: 'image/png', sizeBytes: 10 })
          .expect(201)
      ).body.data.attachment;
      // Bypass the signed URL to store the wrong size.
      const row = await prisma.attachment.findUniqueOrThrow({
        where: { id: mismatched.id },
      });
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: row.key,
          Body: 'much longer than ten bytes',
          ContentType: 'image/png',
        }),
      );

      const res = await http()
        .post('/api/v1/warranties')
        .set(u.auth)
        .send(warrantyBody([randomUUID(), pending.id, mismatched.id]))
        .expect(422);
      expect(res.body.errors).toEqual([
        expect.objectContaining({
          field: 'proofOfPurchase[0].id',
          code: 'ATTACHMENT_NOT_FOUND',
        }),
        expect.objectContaining({
          field: 'proofOfPurchase[1].id',
          code: 'ATTACHMENT_NOT_UPLOADED',
        }),
        expect.objectContaining({
          field: 'proofOfPurchase[2].id',
          code: 'ATTACHMENT_MISMATCH',
        }),
      ]);
    });

    it('upload rules: type and size', async () => {
      const u = await newUser();
      const res = await http()
        .post('/api/v1/uploads')
        .set(u.auth)
        .send({ mimeType: 'video/mp4', sizeBytes: 11 * 1024 * 1024 })
        .expect(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'mimeType',
            message: 'Use JPG, PNG, HEIC or PDF files.',
          }),
          expect.objectContaining({
            field: 'sizeBytes',
            message: 'Each file must be 10 MB or smaller.',
          }),
        ]),
      );
    });
  });

  describe('isolation', () => {
    it("another user's warranty is 404 everywhere, and their files can't be borrowed", async () => {
      const a = await newUser();
      const b = await newUser();
      const w = await createWarranty(a);

      await http().get(`/api/v1/warranties/${w.id}`).set(b.auth).expect(404);
      const patch = await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(b.auth)
        .send({ productName: 'Mine now' })
        .expect(404);
      expect(patch.body.code).toBe('WARRANTY_NOT_FOUND');
      await http().delete(`/api/v1/warranties/${w.id}`).set(b.auth).expect(204); // idempotent no-op…
      await http().get(`/api/v1/warranties/${w.id}`).set(a.auth).expect(200); // …that didn't delete A's

      const steal = await http()
        .post('/api/v1/warranties')
        .set(b.auth)
        .send(warrantyBody([w.proofOfPurchase[0].id]))
        .expect(422);
      expect(steal.body.errors[0].code).toBe('ATTACHMENT_NOT_FOUND');
      expect(
        (await http().get('/api/v1/warranties').set(b.auth).expect(200)).body
          .data,
      ).toEqual([]);
    });

    it("a file already on one warranty can't be reused on another of the same user", async () => {
      const u = await newUser();
      const w = await createWarranty(u);
      const res = await http()
        .post('/api/v1/warranties')
        .set(u.auth)
        .send(warrantyBody([w.proofOfPurchase[0].id]))
        .expect(422);
      expect(res.body.errors[0].code).toBe('ATTACHMENT_NOT_FOUND');
    });

    it('401 without a token', async () => {
      await http().get('/api/v1/warranties').expect(401);
      await http()
        .post('/api/v1/uploads')
        .send({ mimeType: 'application/pdf', sizeBytes: 1 })
        .expect(401);
    });
  });

  describe('update + delete', () => {
    it('PATCH is partial; replacing a file deletes the old row and object', async () => {
      const u = await newUser();
      const w = await createWarranty(u);
      const oldId = w.proofOfPurchase[0].id;
      const oldKey = (
        await prisma.attachment.findUniqueOrThrow({ where: { id: oldId } })
      ).key;
      const next = await upload(u);

      const res = await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ store: 'Senheng', proofOfPurchase: [{ id: next.id }] })
        .expect(200);
      expect(res.body.data).toMatchObject({
        productName: 'Samsung 55" QLED TV',
        store: 'Senheng',
      });
      expect(
        (res.body.data.proofOfPurchase as { id: string }[]).map((a) => a.id),
      ).toEqual([next.id]);
      expect(
        await prisma.attachment.findUnique({ where: { id: oldId } }),
      ).toBeNull();
      expect(await objectExists(oldKey)).toBe(false);

      // The UI sends back full attachment objects on edit; those are accepted as-is.
      await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ proofOfPurchase: res.body.data.proofOfPurchase, store: '' })
        .expect(200)
        .expect((r) => expect(r.body.data).not.toHaveProperty('store')); // "" clears

      await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ price: { amount: 10, currency: 'MYR' } })
        .expect(200);
      await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ price: null })
        .expect(200)
        .expect((r) => expect(r.body.data).not.toHaveProperty('price')); // null clears
    });

    it('changing the purchase date recomputes expiry unless one is given', async () => {
      const u = await newUser();
      const w = await createWarranty(u, {
        purchaseDate: '2026-01-15',
        warrantyMonths: 12,
      });
      expect(w.expiryDate).toBe('2027-01-15');
      const res = await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ warrantyMonths: 24 })
        .expect(200);
      expect(res.body.data.expiryDate).toBe('2028-01-15');
      const manual = await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ expiryDate: '2029-06-30' })
        .expect(200);
      expect(manual.body.data.expiryDate).toBe('2029-06-30');
    });

    it('DELETE removes the warranty, its files and reminders', async () => {
      const u = await newUser();
      const w = await createWarranty(u, { expiryDate: ymd(60) });
      const key = (
        await prisma.attachment.findUniqueOrThrow({
          where: { id: w.proofOfPurchase[0].id },
        })
      ).key;
      expect(
        await prisma.reminder.count({ where: { warrantyId: w.id } }),
      ).toBeGreaterThan(0);

      await http().delete(`/api/v1/warranties/${w.id}`).set(u.auth).expect(204);
      expect(
        await prisma.warranty.findUnique({ where: { id: w.id } }),
      ).toBeNull();
      expect(
        await prisma.attachment.count({ where: { warrantyId: w.id } }),
      ).toBe(0);
      expect(await prisma.reminder.count({ where: { warrantyId: w.id } })).toBe(
        0,
      );
      expect(await objectExists(key)).toBe(false);
    });
  });

  describe('reminders', () => {
    it('plans 09:00 local on expiry − offset, skipping past ones; follows edits and timezone changes', async () => {
      const u = await newUser({ timezone: 'Asia/Kuala_Lumpur' });
      const expiry = ymd(10);
      const w = await createWarranty(u, {
        expiryDate: expiry,
        reminderOffsetsDays: [30, 7, 0],
      });
      const at = (days: number, utcHour: number) => {
        const d = new Date(`${expiry}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - days);
        d.setUTCHours(utcHour);
        return d;
      };
      const rows = async () =>
        (
          await prisma.reminder.findMany({
            where: { warrantyId: w.id },
            orderBy: { sendAt: 'asc' },
          })
        ).map((r) => ({
          offsetDays: r.offsetDays,
          sendAt: r.sendAt,
        }));
      expect(await rows()).toEqual([
        { offsetDays: 7, sendAt: at(7, 1) }, // 09:00 MYT = 01:00Z; 30 days before is already past
        { offsetDays: 0, sendAt: at(0, 1) },
      ]);

      const settings = (
        await http()
          .get('/api/v1/me/notification-settings')
          .set(u.auth)
          .expect(200)
      ).body.data;
      await http()
        .put('/api/v1/me/notification-settings')
        .set(u.auth)
        .send({ ...settings, timezone: 'UTC' })
        .expect(200);
      expect(await rows()).toEqual([
        { offsetDays: 7, sendAt: at(7, 9) },
        { offsetDays: 0, sendAt: at(0, 9) },
      ]);

      await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ reminderOffsetsDays: [] })
        .expect(200);
      expect(await rows()).toEqual([]);
    });

    it('sends each reminder once (push + email), even with two concurrent runs; stale ones are skipped', async () => {
      const u = await newUser({ emailEnabled: true });
      const token = `ExponentPushToken[${randomUUID()}]`;
      await http()
        .post('/api/v1/me/push-tokens')
        .set(u.auth)
        .send({ token, provider: 'expo', platform: 'ios' })
        .expect(200);
      const w = await createWarranty(u, {
        productName: 'Dyson V15',
        expiryDate: ymd(7),
        reminderOffsetsDays: [7, 0],
      });
      const due = await prisma.reminder.findFirstOrThrow({
        where: { warrantyId: w.id, offsetDays: 7 },
      });
      // A reminder from 3 days ago (server was down) is skipped, not sent late.
      await prisma.reminder.update({
        where: {
          id: (
            await prisma.reminder.findFirstOrThrow({
              where: { warrantyId: w.id, offsetDays: 0 },
            })
          ).id,
        },
        data: { sendAt: new Date(due.sendAt.getTime() - 3 * DAY) },
      });

      pushed.length = 0;
      sentMail.length = 0;
      const reminders = app.get(RemindersService);
      const runAt = new Date(due.sendAt.getTime() + 60_000);
      await Promise.all([reminders.sendDue(runAt), reminders.sendDue(runAt)]);

      const mine = pushed.filter((p) => p.token === token);
      expect(mine).toEqual([
        {
          token,
          title: 'Dyson V15 warranty ends in 7 days',
          body: "Tap to see what's covered.",
          url: `jaminly://warranty/${w.id}`,
        },
      ]);
      const mails = sentMail.filter((m) => m.to === u.email);
      expect(mails).toHaveLength(1);
      expect(mails[0].subject).toBe('Dyson V15 warranty ends in 7 days');
      expect(mails[0].text).toContain('Covered: Parts, Labour');
      expect(mails[0].html).toContain(`/warranty/${w.id}`);
      expect(
        await prisma.reminder.count({
          where: { warrantyId: w.id, sentAt: null },
        }),
      ).toBe(0);

      // Nothing left to send.
      pushed.length = 0;
      await reminders.sendDue(runAt);
      expect(pushed.filter((p) => p.token === token)).toEqual([]);
    });

    it('drops push tokens the provider reports as dead; an already-sent reminder is not re-planned', async () => {
      const u = await newUser();
      const token = `ExponentPushToken[${randomUUID()}]`;
      await http()
        .post('/api/v1/me/push-tokens')
        .set(u.auth)
        .send({ token, provider: 'expo', platform: 'android' })
        .expect(200);
      const w = await createWarranty(u, {
        expiryDate: ymd(3),
        reminderOffsetsDays: [0],
      });
      const r = await prisma.reminder.findFirstOrThrow({
        where: { warrantyId: w.id },
      });

      deadTokens = [token];
      await app
        .get(RemindersService)
        .sendDue(new Date(r.sendAt.getTime() + 1000));
      deadTokens = [];
      expect(
        await prisma.pushToken.findUnique({ where: { token } }),
      ).toBeNull();

      // Saving again with the same expiry must not bring the sent reminder back.
      await http()
        .patch(`/api/v1/warranties/${w.id}`)
        .set(u.auth)
        .send({ store: 'x' })
        .expect(200);
      expect(
        await prisma.reminder.findMany({ where: { warrantyId: w.id } }),
      ).toEqual([
        expect.objectContaining({ offsetDays: 0, sentAt: expect.any(Date) }),
      ]);
    });
  });

  describe('settings + push tokens', () => {
    it('settings round-trip with defaults; bad timezone → 422', async () => {
      const u = await newUser();
      const get = await http()
        .get('/api/v1/me/notification-settings')
        .set(u.auth)
        .expect(200);
      expect(get.body.data).toEqual({
        push: true,
        email: false,
        defaultReminders: [30, 7, 0],
        timezone: 'UTC',
      });
      const put = await http()
        .put('/api/v1/me/notification-settings')
        .set(u.auth)
        .send({
          push: false,
          email: true,
          defaultReminders: [7, 60, 7],
          timezone: 'Europe/London',
        })
        .expect(200);
      expect(put.body.data).toEqual({
        push: false,
        email: true,
        defaultReminders: [60, 7],
        timezone: 'Europe/London',
      });
      const bad = await http()
        .put('/api/v1/me/notification-settings')
        .set(u.auth)
        .send({ ...put.body.data, timezone: 'Mars/Base' })
        .expect(422);
      expect(bad.body.errors[0]).toMatchObject({
        field: 'timezone',
        code: 'INVALID_TIMEZONE',
      });
    });

    it('push tokens: idempotent, move between accounts, removable only by the owner', async () => {
      const a = await newUser();
      const b = await newUser();
      const token = `ExponentPushToken[${randomUUID()}]`;
      const body = { token, provider: 'expo', platform: 'ios' };
      await http()
        .post('/api/v1/me/push-tokens')
        .set(a.auth)
        .send(body)
        .expect(200);
      await http()
        .post('/api/v1/me/push-tokens')
        .set(a.auth)
        .send(body)
        .expect(200);
      await http()
        .post('/api/v1/me/push-tokens')
        .set(b.auth)
        .send(body)
        .expect(200);
      expect(
        (await prisma.pushToken.findUniqueOrThrow({ where: { token } })).userId,
      ).toBe(b.id);

      await http()
        .delete(`/api/v1/me/push-tokens/${encodeURIComponent(token)}`)
        .set(a.auth)
        .expect(204);
      expect(
        await prisma.pushToken.findUnique({ where: { token } }),
      ).not.toBeNull();
      await http()
        .delete(`/api/v1/me/push-tokens/${encodeURIComponent(token)}`)
        .set(b.auth)
        .expect(204);
      expect(
        await prisma.pushToken.findUnique({ where: { token } }),
      ).toBeNull();
    });
  });

  describe('cleanup jobs', () => {
    it('removes uploads never attached within 24 h (row + file), keeps recent and linked ones', async () => {
      const u = await newUser();
      const stale = await upload(u);
      const fresh = await upload(u);
      const linked = await createWarranty(u);
      await prisma.attachment.update({
        where: { id: stale.id },
        data: { createdAt: new Date(Date.now() - 25 * 60 * 60_000) },
      });
      const staleKey = (
        await prisma.attachment.findUniqueOrThrow({ where: { id: stale.id } })
      ).key;

      await app.get(AttachmentsService).cleanupUnlinked();
      expect(
        await prisma.attachment.findUnique({ where: { id: stale.id } }),
      ).toBeNull();
      expect(await objectExists(staleKey)).toBe(false);
      expect(
        await prisma.attachment.findUnique({ where: { id: fresh.id } }),
      ).not.toBeNull();
      expect(
        await prisma.attachment.findUnique({
          where: { id: linked.proofOfPurchase[0].id },
        }),
      ).not.toBeNull();
    });

    it('removes password sign-ups never verified within 7 days', async () => {
      const old = await prisma.user.create({
        data: {
          email: `stale-${randomUUID()}@example.com`,
          name: 'S',
          passwordHash: 'x',
          createdAt: new Date(Date.now() - 8 * DAY),
        },
      });
      const recent = await prisma.user.create({
        data: {
          email: `recent-${randomUUID()}@example.com`,
          name: 'R',
          passwordHash: 'x',
        },
      });
      userIds.push(old.id, recent.id);
      await app.get(UsersCleanup).run();
      expect(
        await prisma.user.findUnique({ where: { id: old.id } }),
      ).toBeNull();
      expect(
        await prisma.user.findUnique({ where: { id: recent.id } }),
      ).not.toBeNull();
    });
  });
});

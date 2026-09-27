import {
  ListObjectsV2Command,
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
  GoogleVerifierService,
  type GoogleProfile,
} from '../src/infrastructure/google/google-verifier.service';
import {
  MailService,
  type Mail,
} from '../src/infrastructure/mail/mail.service';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

// Fakes for the two things we can't run locally: Google and a real inbox. DB and S3 are real.
const googleTokens = new Map<string, GoogleProfile>();
const fakeGoogle = {
  verify: (idToken: string) =>
    Promise.resolve(googleTokens.get(idToken) ?? null),
};
const sentMail: Mail[] = [];
const fakeMail = { send: (m: Mail) => (sentMail.push(m), Promise.resolve()) };

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

describe('auth + users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const createdSubs: string[] = [];
  const createdEmails: string[] = [];
  const newEmail = () => {
    const email = `user-${randomUUID()}@example.com`;
    createdEmails.push(email);
    return email;
  };
  const mailCount = () => sentMail.length;

  /** Signs up with email/password and verifies with the emailed code. */
  async function signUp(email = newEmail(), password = 'hunter2hunter2') {
    await http()
      .post('/api/v1/auth/register')
      .send({ name: 'Email User', email, password })
      .expect(201);
    const res = await http()
      .post('/api/v1/auth/verify-email')
      .send({ email, code: lastCode() })
      .expect(200);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }
  const login = (email: string, password: string) =>
    http().post('/api/v1/auth/login').send({ email, password });

  /** Registers a Google identity with the fake and signs in with it. */
  async function signIn(overrides: Partial<GoogleProfile> = {}) {
    const sub = overrides.sub ?? `google-${randomUUID()}`;
    createdSubs.push(sub);
    const idToken = `id-${randomUUID()}`;
    googleTokens.set(idToken, {
      sub,
      email: `${sub}@example.com`,
      emailVerified: true,
      name: 'Test User',
      ...overrides,
    });
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken })
      .expect(200);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }
  const lastCode = () => /Your code is (\d{6})/.exec(sentMail.at(-1)!.text)![1];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleVerifierService)
      .useValue(fakeGoogle)
      .overrideProvider(MailService)
      .useValue(fakeMail)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { googleSub: { in: createdSubs } },
          { email: { in: createdEmails } },
        ],
      },
    });
    await app.close();
  });

  describe('POST /auth/google', () => {
    it('creates the account on first sign-in and returns tokens + user', async () => {
      const res = await http()
        .post('/api/v1/auth/google')
        .send({ idToken: 'unknown' })
        .expect(401);
      expect(res.body.code).toBe('INVALID_GOOGLE_TOKEN');

      const session = await signIn({
        name: 'Farid',
        picture: 'https://example.com/a.png',
      });
      expect(session.accessToken.split('.')).toHaveLength(3);
      expect(session.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(session.user).toEqual({
        id: expect.any(String),
        email: expect.stringContaining('@example.com'),
        name: 'Farid',
        avatarUrl: 'https://example.com/a.png',
      });
    });

    it('same Google account → same user, profile updated; no null fields', async () => {
      const sub = `google-${randomUUID()}`;
      const first = await signIn({ sub, name: 'Old Name' });
      const second = await signIn({
        sub,
        name: 'New Name',
        picture: undefined,
      });
      expect(second.user.id).toBe(first.user.id);
      expect(second.user).toEqual({
        id: first.user.id,
        email: `${sub}@example.com`,
        name: 'New Name',
      });
    });

    it('rejects an unverified Google email', async () => {
      const idToken = `id-${randomUUID()}`;
      googleTokens.set(idToken, {
        sub: `google-${randomUUID()}`,
        email: 'x@example.com',
        emailVerified: false,
        name: 'X',
      });
      const res = await http()
        .post('/api/v1/auth/google')
        .send({ idToken })
        .expect(401);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('422 when idToken is missing', async () => {
      const res = await http().post('/api/v1/auth/google').send({}).expect(422);
      expect(res.body.errors).toEqual([
        expect.objectContaining({ field: 'idToken', code: 'REQUIRED' }),
      ]);
    });
  });

  describe('JWT guard + GET /me', () => {
    it('401 without, with a malformed, or with a foreign-signed token', async () => {
      await http().get('/api/v1/me').expect(401);
      await http()
        .get('/api/v1/me')
        .set('authorization', 'Bearer nope')
        .expect(401);
      const forged = new JwtService({ secret: 'not-our-secret' }).sign({
        sub: randomUUID(),
      });
      const res = await http()
        .get('/api/v1/me')
        .set('authorization', `Bearer ${forged}`)
        .expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns the profile for a valid token', async () => {
      const s = await signIn();
      const res = await http()
        .get('/api/v1/me')
        .set('authorization', `Bearer ${s.accessToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ code: 'USER_FETCHED', data: s.user });
    });
  });

  describe('refresh rotation', () => {
    it('rotates, and reusing an old token revokes the whole family', async () => {
      const s = await signIn();
      const r1 = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(200);
      expect(r1.body.code).toBe('TOKEN_REFRESHED');
      const next = r1.body.data.refreshToken as string;
      expect(next).not.toBe(s.refreshToken);

      // Old token again (e.g. stolen copy) → rejected, and the legit newer token dies too.
      const reuse = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(401);
      expect(reuse.body.code).toBe('INVALID_REFRESH_TOKEN');
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: next })
        .expect(401);
    });

    it('two concurrent refreshes with one token: at most one wins', async () => {
      const s = await signIn();
      const results = await Promise.all([
        http()
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: s.refreshToken }),
        http()
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: s.refreshToken }),
      ]);
      expect(
        results.filter((r) => r.status === 200).length,
      ).toBeLessThanOrEqual(1);
    });

    it('logout revokes the token and is idempotent', async () => {
      const s = await signIn();
      await http()
        .post('/api/v1/auth/logout')
        .send({ refreshToken: s.refreshToken })
        .expect(204);
      await http()
        .post('/api/v1/auth/logout')
        .send({ refreshToken: s.refreshToken })
        .expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(401);
    });
  });

  describe('email + password', () => {
    it('register → no session until the emailed code is entered → sign in', async () => {
      const email = newEmail();
      const reg = await http()
        .post('/api/v1/auth/register')
        .send({
          name: '  Aiman ',
          email: email.toUpperCase(),
          password: 'hunter2hunter2',
        })
        .expect(201);
      expect(reg.body).toMatchObject({
        code: 'VERIFICATION_SENT',
        data: { email, resendAfterSeconds: 30 },
      });
      expect(reg.body.data).not.toHaveProperty('accessToken');
      expect(sentMail.at(-1)!.to).toBe(email);
      expect(sentMail.at(-1)!.subject).toBe('Your Jaminly verification code');
      const code = lastCode();

      // Right password, unverified: refused, and says why.
      const early = await login(email, 'hunter2hunter2').expect(401);
      expect(early.body.code).toBe('EMAIL_NOT_VERIFIED');

      const wrong = code === '000000' ? '111111' : '000000';
      const bad = await http()
        .post('/api/v1/auth/verify-email')
        .send({ email, code: wrong })
        .expect(422);
      expect(bad.body).toMatchObject({
        code: 'CODE_INVALID',
        message: "That code isn't right. Check the email or send a new one.",
      });

      const ok = await http()
        .post('/api/v1/auth/verify-email')
        .send({ email, code })
        .expect(200);
      expect(ok.body.code).toBe('SIGNED_IN');
      expect(ok.body.data.user).toEqual({
        id: expect.any(String),
        email,
        name: 'Aiman',
      });

      // The code is single use.
      await http()
        .post('/api/v1/auth/verify-email')
        .send({ email, code })
        .expect(422);

      // Login is case-insensitive on the email.
      const res = await login(email.toUpperCase(), 'hunter2hunter2').expect(
        200,
      );
      expect(res.body.data.user.id).toBe(ok.body.data.user.id);
      await http()
        .get('/api/v1/me')
        .set('authorization', `Bearer ${res.body.data.accessToken}`)
        .expect(200);
    });

    it('login gives one answer for unknown email, wrong password, and Google-only accounts', async () => {
      const s = await signUp();
      const google = await signIn();
      for (const [email, password] of [
        [`nobody-${randomUUID()}@example.com`, 'hunter2hunter2'],
        [s.user.email, 'wrong-password'],
        [google.user.email, 'hunter2hunter2'],
      ]) {
        const res = await login(email, password).expect(401);
        expect(res.body).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        });
      }
    });

    it('409 for an email that already has a verified account', async () => {
      const s = await signUp();
      const res = await http()
        .post('/api/v1/auth/register')
        .send({
          name: 'Other',
          email: s.user.email,
          password: 'another-password',
        })
        .expect(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('re-registering an unverified email replaces its password (nobody proved the inbox)', async () => {
      const email = newEmail();
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'Squatter', email, password: 'squatter-password' })
        .expect(201);
      await prisma.emailCode.updateMany({
        where: { user: { email } },
        data: { sentAt: new Date(Date.now() - 60_000) }, // past the resend wait
      });
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'Owner', email, password: 'owner-password' })
        .expect(201);
      await http()
        .post('/api/v1/auth/verify-email')
        .send({ email, code: lastCode() })
        .expect(200);
      await login(email, 'squatter-password').expect(401);
      const res = await login(email, 'owner-password').expect(200);
      expect(res.body.data.user.name).toBe('Owner');
    });

    it('resend and forgot-password answer the same for unknown emails, without sending mail', async () => {
      const unknown = `nobody-${randomUUID()}@example.com`;
      const before = mailCount();
      const resend = await http()
        .post('/api/v1/auth/verify-email/resend')
        .send({ email: unknown })
        .expect(200);
      expect(resend.body.data).toEqual({
        email: unknown,
        resendAfterSeconds: 30,
      });
      const forgot = await http()
        .post('/api/v1/auth/password/forgot')
        .send({ email: unknown })
        .expect(200);
      expect(forgot.body.data).toEqual({
        email: unknown,
        resendAfterSeconds: 30,
      });
      expect(mailCount()).toBe(before);

      // A reset attempt for an unknown email looks like a wrong code.
      const reset = await http()
        .post('/api/v1/auth/password/reset')
        .send({ email: unknown, code: '123456', password: 'whatever-password' })
        .expect(422);
      expect(reset.body.code).toBe('CODE_INVALID');
    });

    it('password reset: new password works, old one and other sessions stop working', async () => {
      const email = newEmail();
      const s = await signUp(email, 'old-password-1');
      await http()
        .post('/api/v1/auth/password/forgot')
        .send({ email })
        .expect(200);
      expect(sentMail.at(-1)!.subject).toBe('Your Jaminly password reset code');

      const res = await http()
        .post('/api/v1/auth/password/reset')
        .send({ email, code: lastCode(), password: 'new-password-2' })
        .expect(200);
      expect(res.body.data.user.id).toBe(s.user.id);

      await login(email, 'old-password-1').expect(401);
      await login(email, 'new-password-2').expect(200);
      // The session from before the reset is gone.
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(401);
    });

    it('a Google-only account can add a password through forgot-password', async () => {
      const g = await signIn();
      await http()
        .post('/api/v1/auth/password/forgot')
        .send({ email: g.user.email })
        .expect(200);
      await http()
        .post('/api/v1/auth/password/reset')
        .send({
          email: g.user.email,
          code: lastCode(),
          password: 'now-i-have-one',
        })
        .expect(200);
      const res = await login(g.user.email, 'now-i-have-one').expect(200);
      expect(res.body.data.user.id).toBe(g.user.id);
    });

    it('Google sign-in links to a verified password account with the same email', async () => {
      const email = newEmail();
      const s = await signUp(email, 'keep-this-password');
      const g = await signIn({ email: email.toUpperCase() });
      expect(g.user.id).toBe(s.user.id);
      await login(email, 'keep-this-password').expect(200); // password still works
    });

    it('Google sign-in takes over an unverified password account and drops its password', async () => {
      const email = newEmail();
      await http()
        .post('/api/v1/auth/register')
        .send({ name: 'Squatter', email, password: 'squatter-password' })
        .expect(201);
      const g = await signIn({ email });
      const row = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(row.id).toBe(g.user.id);
      expect(row.passwordHash).toBeNull();
      expect(row.emailVerifiedAt).not.toBeNull();
      await login(email, 'squatter-password').expect(401);
    });

    it('validates fields with per-field codes', async () => {
      const res = await http()
        .post('/api/v1/auth/register')
        .send({ name: '', email: 'not-an-email', password: 'short' })
        .expect(422);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', code: 'REQUIRED' }),
          expect.objectContaining({ field: 'email', code: 'INVALID_EMAIL' }),
          expect.objectContaining({
            field: 'password',
            code: 'TOO_SHORT',
            message: 'Use at least 8 characters.',
          }),
        ]),
      );
    });
  });

  describe('account deletion', () => {
    it('emails a code, enforces the resend wait, rejects wrong codes, deletes everything on the right one', async () => {
      const s = await signIn();
      const auth = { authorization: `Bearer ${s.accessToken}` };
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: `users/${s.user.id}/r1.jpg`,
          Body: 'x',
        }),
      );

      const req = await http()
        .post('/api/v1/me/deletion')
        .set(auth)
        .expect(200);
      expect(req.body).toMatchObject({
        code: 'DELETION_CODE_SENT',
        data: { email: s.user.email, resendAfterSeconds: 30 },
      });
      expect(sentMail.at(-1)!.to).toBe(s.user.email);
      const code = lastCode();

      const again = await http()
        .post('/api/v1/me/deletion')
        .set(auth)
        .expect(429);
      expect(again.body.code).toBe('DELETION_CODE_RECENTLY_SENT');
      expect(again.body.errors[0].details.resendAfterSeconds).toBeGreaterThan(
        0,
      );

      const wrong = code === '000000' ? '111111' : '000000';
      const bad = await http()
        .delete('/api/v1/me')
        .set(auth)
        .send({ code: wrong })
        .expect(422);
      expect(bad.body).toMatchObject({
        code: 'DELETION_CODE_INVALID',
        message: "That code isn't right. Check the email or send a new one.",
      });

      // Spaces are ignored ("123 456" pasted from the email).
      await http()
        .delete('/api/v1/me')
        .set(auth)
        .send({ code: `${code.slice(0, 3)} ${code.slice(3)}` })
        .expect(204);

      expect(
        await prisma.user.findUnique({ where: { id: s.user.id } }),
      ).toBeNull();
      expect(
        await prisma.refreshToken.count({ where: { userId: s.user.id } }),
      ).toBe(0);
      const left = await s3.send(
        new ListObjectsV2Command({
          Bucket: env.S3_BUCKET,
          Prefix: `users/${s.user.id}/`,
        }),
      );
      expect(left.KeyCount ?? 0).toBe(0);

      // The still-unexpired access token no longer works for a deleted user.
      await http().get('/api/v1/me').set(auth).expect(401);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(401);
    });

    it('locks after 5 wrong attempts, even for the right code', async () => {
      const s = await signIn();
      const auth = { authorization: `Bearer ${s.accessToken}` };
      await http().post('/api/v1/me/deletion').set(auth).expect(200);
      const code = lastCode();
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++)
        await http()
          .delete('/api/v1/me')
          .set(auth)
          .send({ code: wrong })
          .expect(422);
      const res = await http()
        .delete('/api/v1/me')
        .set(auth)
        .send({ code })
        .expect(422);
      expect(res.body.code).toBe('DELETION_CODE_EXPIRED');
      expect(
        await prisma.user.findUnique({ where: { id: s.user.id } }),
      ).not.toBeNull();
    });

    it('rejects an expired code, and 422s an empty one', async () => {
      const s = await signIn();
      const auth = { authorization: `Bearer ${s.accessToken}` };
      await http().post('/api/v1/me/deletion').set(auth).expect(200);
      await prisma.emailCode.update({
        where: {
          userId_purpose: { userId: s.user.id, purpose: 'DELETE_ACCOUNT' },
        },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const res = await http()
        .delete('/api/v1/me')
        .set(auth)
        .send({ code: lastCode() })
        .expect(422);
      expect(res.body.code).toBe('DELETION_CODE_EXPIRED');

      const empty = await http()
        .delete('/api/v1/me')
        .set(auth)
        .send({ code: '' })
        .expect(422);
      expect(empty.body.code).toBe('VALIDATION_ERROR');
    });
  });
});

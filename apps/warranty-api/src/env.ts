// The only place that reads process.env. Modules add their vars here when they land.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// .env is optional; real env vars win. Not process.loadEnvFile(): Jest gives tests a copy of process.env.
if (existsSync('.env')) {
  for (const [key, value] of Object.entries(
    parseEnv(readFileSync('.env', 'utf8')),
  ))
    process.env[key] ??= value;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  return value;
}

const list = (value = '') =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: required('DATABASE_URL'),
  CORS_ORIGINS: list(process.env.CORS_ORIGINS),
  SWAGGER:
    process.env.NODE_ENV !== 'production' || process.env.SWAGGER === 'true',
  TRUST_REQUEST_ID: process.env.TRUST_REQUEST_ID === 'true',

  JWT_SECRET: jwtSecret(),
  // Empty = Google sign-in refuses every token (never "accept any audience").
  GOOGLE_CLIENT_IDS: list(process.env.GOOGLE_CLIENT_IDS),

  S3_ENDPOINT: process.env.S3_ENDPOINT || undefined, // empty = AWS
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_BUCKET: required('S3_BUCKET'),
  S3_ACCESS_KEY_ID: required('S3_ACCESS_KEY_ID'),
  S3_SECRET_ACCESS_KEY: required('S3_SECRET_ACCESS_KEY'),

  // Presigned URLs go to devices, so they must use an address the device can reach (e.g. a LAN IP
  // in dev, the public bucket endpoint in production). Empty = S3_ENDPOINT.
  S3_PUBLIC_ENDPOINT:
    process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || undefined,

  SMTP_URL: required('SMTP_URL'),
  MAIL_FROM: required('MAIL_FROM'),
  /** Links in emails, e.g. reminder emails → <WEB_APP_URL>/warranty/<id>. */
  WEB_APP_URL: (process.env.WEB_APP_URL || 'http://localhost:8081').replace(
    /\/$/,
    '',
  ),

  PUSH_PROVIDER: pushProvider(),
  EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || undefined,

  // Hosted-instance soft limits. Empty = no limit (self-hosting).
  USER_WARRANTY_LIMIT: optionalInt('USER_WARRANTY_LIMIT'),
  USER_STORAGE_LIMIT_MB: optionalInt('USER_STORAGE_LIMIT_MB'),
};

function pushProvider(): 'expo' | 'log' {
  const value = process.env.PUSH_PROVIDER || 'expo';
  if (value !== 'expo' && value !== 'log')
    throw new Error(`PUSH_PROVIDER must be expo or log, got ${value}.`);
  return value;
}

function optionalInt(name: string): number | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`${name} must be a non-negative integer.`);
  return n;
}

function jwtSecret() {
  const secret = required('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && secret.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  return secret;
}

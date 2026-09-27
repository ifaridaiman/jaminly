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

  SMTP_URL: required('SMTP_URL'),
  MAIL_FROM: required('MAIL_FROM'),
};

function jwtSecret() {
  const secret = required('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && secret.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  return secret;
}

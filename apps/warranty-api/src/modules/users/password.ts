import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// OWASP minimum for scrypt. Stored in the hash, so raising it later keeps old hashes verifiable.
const PARAMS = { N: 2 ** 14, r: 8, p: 1 };
const KEY_LENGTH = 64;

/** "scrypt$N$r$p$<salt b64>$<hash b64>" */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return [
    'scrypt',
    N,
    r,
    p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algo, N, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    },
  );
  return timingSafeEqual(key, expected);
}

let dummy: Promise<string> | undefined;
/** Burns the same time as a real check, so "no such account" isn't faster than "wrong password". */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummy ??= hashPassword('not-a-real-password');
  await verifyPassword(password, await dummy);
  return false;
}

import { hashPassword, verifyAgainstDummy, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored).toMatch(
      /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    );
    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('correct horse batterY', stored)).resolves.toBe(
      false,
    );
    await expect(verifyPassword('', stored)).resolves.toBe(false);
  });

  it('salts: the same password hashes differently', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored values instead of throwing', async () => {
    await expect(verifyPassword('x', 'bcrypt$whatever')).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
  });

  it('dummy check always fails', async () => {
    await expect(verifyAgainstDummy('anything')).resolves.toBe(false);
  });
});

import { Injectable } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { ServiceUnavailableError } from '../../common/errors/app-error';
import { env } from '../../env';

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

/** Verifies Google ID tokens (signature, expiry, audience). Returns null for any invalid token. */
@Injectable()
export class GoogleVerifierService {
  private readonly client = new OAuth2Client(); // caches Google's signing keys

  async verify(idToken: string): Promise<GoogleProfile | null> {
    // An empty audience list would skip the audience check, so refuse instead.
    if (!env.GOOGLE_CLIENT_IDS.length)
      throw new ServiceUnavailableError(
        'GOOGLE_NOT_CONFIGURED',
        'Google sign-in is not configured (GOOGLE_CLIENT_IDS).',
      );

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_IDS,
      });
      payload = ticket.getPayload();
    } catch {
      return null; // bad signature, expired, wrong audience, malformed
    }
    if (!payload?.sub || !payload.email) return null;
    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? payload.email,
      picture: payload.picture,
    };
  }
}

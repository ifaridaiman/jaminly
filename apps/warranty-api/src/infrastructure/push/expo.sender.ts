import { Injectable, Logger } from '@nestjs/common';
import { getRequestContext } from '../../common/request-context/request-context';
import { env } from '../../env';
import type { PushMessage, PushSender } from './push-sender';

const ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100; // Expo's per-request limit

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

/** Expo Push Service over plain fetch (no expo-server-sdk). */
@Injectable()
export class ExpoSender implements PushSender {
  private readonly logger = new Logger('ExpoPush');

  async send(messages: PushMessage[]) {
    const invalidTokens: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            'x-request-id': getRequestContext().requestId,
            ...(env.EXPO_ACCESS_TOKEN && {
              authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
            }),
          },
          body: JSON.stringify(
            batch.map((m) => ({
              to: m.token,
              title: m.title,
              body: m.body,
              data: { url: m.url },
              sound: 'default',
            })),
          ),
        });
        const json = (await res.json().catch(() => null)) as {
          data?: Ticket[];
        } | null;
        if (!res.ok || !json?.data) {
          this.logger.error({ status: res.status }, 'Expo push request failed');
          continue;
        }
        json.data.forEach((ticket, j) => {
          if (
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          )
            invalidTokens.push(batch[j].token);
        });
      } catch (err) {
        this.logger.error({ err: String(err) }, 'Expo push request failed');
      }
    }
    return { invalidTokens };
  }
}

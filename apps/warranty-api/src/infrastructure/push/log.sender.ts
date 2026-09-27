import { Injectable, Logger } from '@nestjs/common';
import type { PushMessage, PushSender } from './push-sender';

/** PUSH_PROVIDER=log: logs instead of sending. Tokens are not logged. */
@Injectable()
export class LogSender implements PushSender {
  private readonly logger = new Logger('Push');

  send(messages: PushMessage[]) {
    for (const m of messages)
      this.logger.log(
        { title: m.title, url: m.url },
        'Push (not sent: PUSH_PROVIDER=log)',
      );
    return Promise.resolve({ invalidTokens: [] });
  }
}

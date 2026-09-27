import { Module } from '@nestjs/common';
import { env } from '../../env';
import { ExpoSender } from './expo.sender';
import { LogSender } from './log.sender';
import { PUSH_SENDER } from './push-sender';

/** The only place that reads PUSH_PROVIDER. A new provider = one adapter + one entry here. */
@Module({
  providers: [
    {
      provide: PUSH_SENDER,
      useClass: { expo: ExpoSender, log: LogSender }[env.PUSH_PROVIDER],
    },
  ],
  exports: [PUSH_SENDER],
})
export class PushModule {}

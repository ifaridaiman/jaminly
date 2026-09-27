import { Module } from '@nestjs/common';
import { MailModule } from '../../infrastructure/mail/mail.module';
import { PushModule } from '../../infrastructure/push/push.module';
import { UsersModule } from '../users';
import { NotificationsController } from './notifications.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [PushModule, MailModule, UsersModule],
  controllers: [NotificationsController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class NotificationsModule {}

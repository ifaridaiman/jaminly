import { Module } from '@nestjs/common';
import { MailModule } from '../../infrastructure/mail/mail.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { DeletionService } from './deletion.service';
import { EmailCodesService } from './email-codes.service';
import { UsersCleanup } from './users.cleanup';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MailModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, DeletionService, EmailCodesService, UsersCleanup],
  exports: [UsersService, EmailCodesService],
})
export class UsersModule {}

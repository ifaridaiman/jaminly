import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments';
import { NotificationsModule } from '../notifications';
import { UsersModule } from '../users';
import { WarrantiesController } from './warranties.controller';
import { WarrantiesService } from './warranties.service';

@Module({
  imports: [AttachmentsModule, NotificationsModule, UsersModule],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
})
export class WarrantiesModule {}

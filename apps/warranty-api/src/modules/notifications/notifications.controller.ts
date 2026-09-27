import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { ValidationError } from '../../common/errors/app-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsersService } from '../users';
import { NotificationsCode } from './notifications.codes';
import {
  NotificationSettingsDto,
  RegisterPushTokenDto,
} from './notifications.dto';
import { RemindersService } from './reminders.service';
import { isValidTimeZone } from './schedule';

@Controller('me')
@ApiErrors(401)
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly reminders: RemindersService,
  ) {}

  @Get('notification-settings')
  @ApiResult({
    code: NotificationsCode.NOTIFICATION_SETTINGS_FETCHED,
    message: 'Settings retrieved.',
    type: NotificationSettingsDto,
  })
  async getSettings(
    @UserId() userId: string,
  ): Promise<NotificationSettingsDto> {
    return this.users.notificationSettings(await this.users.getById(userId));
  }

  @Put('notification-settings')
  @ApiResult({
    summary:
      'Replaces notification settings. A new timezone reschedules pending reminders; new default reminders only affect new warranties.',
    code: NotificationsCode.NOTIFICATION_SETTINGS_UPDATED,
    message: 'Settings saved.',
    type: NotificationSettingsDto,
  })
  @ApiErrors(422)
  async putSettings(
    @UserId() userId: string,
    @Body() dto: NotificationSettingsDto,
  ): Promise<NotificationSettingsDto> {
    if (!isValidTimeZone(dto.timezone))
      throw new ValidationError(
        NotificationsCode.INVALID_TIMEZONE,
        'Unknown timezone.',
        [
          {
            field: 'timezone',
            code: NotificationsCode.INVALID_TIMEZONE,
            message: 'Unknown timezone.',
          },
        ],
      );
    const before = await this.users.getById(userId);
    const after = await this.users.updateNotificationSettings(userId, {
      ...dto,
      defaultReminders: [...new Set(dto.defaultReminders)].sort(
        (a, b) => b - a,
      ),
    });
    if (before.timezone !== after.timezone)
      await this.reminders.replanUser(userId, after.timezone);
    return this.users.notificationSettings(after);
  }

  @Post('push-tokens')
  @ApiResult({
    summary:
      'Registers this device for push. Idempotent; a token that moved to another account is reassigned.',
    code: NotificationsCode.PUSH_TOKEN_REGISTERED,
    message: 'Push notifications on for this device.',
  })
  @ApiErrors(422)
  async registerPushToken(
    @UserId() userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    await this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: { ...dto, userId },
      update: { provider: dto.provider, platform: dto.platform, userId },
    });
    return null;
  }

  @Delete('push-tokens/:token')
  @ApiResult({
    summary: 'Unregisters this device (on sign-out). Idempotent.',
    code: NotificationsCode.PUSH_TOKEN_REMOVED,
    message: 'Push notifications off for this device.',
    status: HttpStatus.NO_CONTENT,
  })
  async removePushToken(
    @UserId() userId: string,
    @Param('token') token: string,
  ) {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
  }
}

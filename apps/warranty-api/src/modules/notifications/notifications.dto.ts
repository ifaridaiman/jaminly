import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Matches the UI's settings minus `appearance` (device-local). */
export class NotificationSettingsDto {
  @IsBoolean()
  push!: boolean;

  @IsBoolean()
  email!: boolean;

  /** Days before expiry for new warranties, 0 = on the day. Existing warranties keep their own. */
  @IsArray()
  @ArrayMaxSize(10, { message: 'Choose up to 10 reminders.' })
  @IsInt({ each: true, message: 'Reminders are whole days.' })
  @Min(0, { each: true, message: 'Use 0 to 365 days.' })
  @Max(365, { each: true, message: 'Use 0 to 365 days.' })
  defaultReminders!: number[];

  /** IANA name, e.g. Asia/Kuala_Lumpur. Reminders fire at 09:00 here. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone!: string;
}

export class RegisterPushTokenDto {
  /** Opaque device token from the push provider (Expo push token today). */
  @IsString()
  @IsNotEmpty({ message: 'Push token is required.' })
  @MaxLength(500)
  token!: string;

  @IsIn(['expo', 'fcm'])
  provider!: string;

  @IsIn(['ios', 'android'])
  platform!: string;
}

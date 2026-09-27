import { IsNotEmpty, IsString } from 'class-validator';

/** Matches the UI's `User` type. */
export class UserDto {
  id!: string;
  email!: string;
  name!: string;
  avatarUrl?: string;
}

export class DeletionRequestedDto {
  /** Where the code was sent. */
  email!: string;
  /** Seconds before another code can be requested. */
  resendAfterSeconds!: number;
}

export class ConfirmDeletionDto {
  /** The 6-digit code from the email. Spaces are ignored. */
  @IsString()
  @IsNotEmpty({ message: 'Enter the code from the email.' })
  code!: string;
}

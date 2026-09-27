import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserDto } from '../users';

export class GoogleSignInDto {
  /** ID token from Google Sign-In on the device. */
  @IsString()
  @IsNotEmpty({ message: 'Google ID token is required.' })
  idToken!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required.' })
  refreshToken!: string;
}

export class AuthTokensDto {
  /** JWT, valid for 15 minutes. Send as `Authorization: Bearer <token>`. */
  accessToken!: string;
  /** Opaque, valid for 60 days, single use: every refresh returns a new one. */
  refreshToken!: string;
  user!: UserDto;
}

export class EmailDto {
  @IsNotEmpty({ message: 'Enter your email.' })
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254, { message: 'Enter a valid email address.' })
  email!: string;
}

export class RegisterDto extends EmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your name.' })
  @MaxLength(100, { message: 'Use 100 characters or fewer.' })
  name!: string;

  /** 8–128 characters. */
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128, { message: 'Use 128 characters or fewer.' }) // keeps scrypt cheap
  password!: string;
}

export class LoginDto extends EmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your password.' })
  @MaxLength(128, { message: 'Email or password is incorrect.' })
  password!: string;
}

export class VerifyEmailDto extends EmailDto {
  /** The 6-digit code from the email. Spaces are ignored. */
  @IsString()
  @IsNotEmpty({ message: 'Enter the code from the email.' })
  code!: string;
}

export class ResetPasswordDto extends VerifyEmailDto {
  /** The new password, 8–128 characters. */
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128, { message: 'Use 128 characters or fewer.' }) // keeps scrypt cheap
  password!: string;
}

export class CodeSentDto {
  /** Where the code was sent (as typed, lower-cased). */
  email!: string;
  /** Seconds before another code can be requested. */
  resendAfterSeconds!: number;
}

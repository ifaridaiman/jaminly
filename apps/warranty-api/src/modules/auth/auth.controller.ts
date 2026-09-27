import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiErrors,
  ApiResult,
} from '../../common/api-response/api-result.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthCode } from './auth.codes';
import {
  AuthTokensDto,
  CodeSentDto,
  EmailDto,
  GoogleSignInDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @ApiResult({
    summary:
      'Exchanges a Google ID token for Jaminly tokens. First sign-in creates the account.',
    code: AuthCode.SIGNED_IN,
    message: 'Signed in.',
    type: AuthTokensDto,
  })
  @ApiErrors(401, 422, 503)
  google(@Body() dto: GoogleSignInDto) {
    return this.auth.signInWithGoogle(dto.idToken);
  }

  @Post('register')
  @ApiResult({
    summary:
      'Creates an email/password account and emails a verification code. Sign-in happens at /auth/verify-email.',
    code: AuthCode.VERIFICATION_SENT,
    message: 'We emailed you a code.',
    type: CodeSentDto,
    status: HttpStatus.CREATED,
  })
  @ApiErrors(409, 422, 502)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @ApiResult({
    summary: 'Confirms the emailed code and signs in.',
    code: AuthCode.SIGNED_IN,
    message: 'Email verified. Signed in.',
    type: AuthTokensDto,
  })
  @ApiErrors(422)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.email, dto.code);
  }

  @Post('verify-email/resend')
  @ApiResult({
    summary:
      'Sends a new verification code if the email has an unverified account. Same answer either way.',
    code: AuthCode.VERIFICATION_SENT,
    message: 'If that email needs verifying, we sent a new code.',
    type: CodeSentDto,
  })
  @ApiErrors(422, 502)
  resendVerification(@Body() dto: EmailDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('login')
  @ApiResult({
    summary: 'Signs in with email and password.',
    code: AuthCode.SIGNED_IN,
    message: 'Signed in.',
    type: AuthTokensDto,
  })
  @ApiErrors(401, 422)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('password/forgot')
  @ApiResult({
    summary:
      'Emails a password reset code if the account exists. Same answer either way.',
    code: AuthCode.PASSWORD_RESET_SENT,
    message: 'If an account uses that email, we sent it a code.',
    type: CodeSentDto,
  })
  @ApiErrors(422, 502)
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @ApiResult({
    summary:
      'Sets a new password with the emailed code, signs out other devices, and signs in.',
    code: AuthCode.SIGNED_IN,
    message: 'Password changed. Signed in.',
    type: AuthTokensDto,
  })
  @ApiErrors(422)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.password);
  }

  @Post('refresh')
  @ApiResult({
    summary:
      'Swaps a refresh token for a new pair. The old refresh token stops working.',
    code: AuthCode.TOKEN_REFRESHED,
    message: 'Session refreshed.',
    type: AuthTokensDto,
  })
  @ApiErrors(401, 422)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @ApiResult({
    summary: 'Revokes the refresh token. Works with an expired access token.',
    code: AuthCode.SIGNED_OUT,
    message: 'Signed out.',
    status: HttpStatus.NO_CONTENT,
  })
  @ApiErrors(422)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refreshToken);
  }
}

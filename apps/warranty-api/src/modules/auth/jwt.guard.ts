import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from '../../common/decorators/public.decorator';
import { AuthenticationError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { getRequestContext } from '../../common/request-context/request-context';

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const header =
      context.switchToHttp().getRequest<Request>().headers.authorization ?? '';
    const token = /^Bearer (.+)$/i.exec(header)?.[1];
    if (!token)
      throw new AuthenticationError(
        ErrorCode.UNAUTHORIZED,
        'Please sign in again.',
      );

    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      getRequestContext().userId = sub; // read by @UserId() and the access log
      return true;
    } catch {
      throw new AuthenticationError(
        ErrorCode.UNAUTHORIZED,
        'Please sign in again.',
      );
    }
  }
}

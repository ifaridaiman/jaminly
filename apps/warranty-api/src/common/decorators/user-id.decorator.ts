import { createParamDecorator } from '@nestjs/common';
import { AuthenticationError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { getRequestContext } from '../request-context/request-context';

/** The signed-in user's id, set by the JWT guard. Only valid on non-@Public() routes. */
export const UserId = createParamDecorator((): string => {
  const { userId } = getRequestContext();
  if (!userId)
    throw new AuthenticationError(
      ErrorCode.UNAUTHORIZED,
      'Please sign in again.',
    );
  return userId;
});

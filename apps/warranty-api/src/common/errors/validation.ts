import type { ValidationError as ClassValidatorError } from 'class-validator';
import type { ApiError } from '../api-response/api-response.types';
import { ValidationError } from './app-error';
import { ErrorCode } from './error-codes';

const CONSTRAINT_CODES: Record<string, string> = {
  isNotEmpty: 'REQUIRED',
  isDefined: 'REQUIRED',
  isYmd: 'INVALID_DATE',
  isDateString: 'INVALID_DATE',
  isIn: 'INVALID_OPTION',
  isEnum: 'INVALID_OPTION',
  min: 'OUT_OF_RANGE',
  max: 'OUT_OF_RANGE',
  maxLength: 'TOO_LONG',
  minLength: 'TOO_SHORT',
  arrayMinSize: 'TOO_FEW_ITEMS',
  arrayMaxSize: 'TOO_MANY_ITEMS',
  whitelistValidation: 'UNKNOWN_FIELD',
};

const toCode = (constraint: string) =>
  CONSTRAINT_CODES[constraint] ??
  `INVALID_${constraint
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/^IS_/, '')}`;

/** class-validator's nested tree → one ApiError per failed rule, with dotted paths ("items[0].qty"). */
export function flattenValidationErrors(
  errors: ClassValidatorError[],
  parent = '',
): ApiError[] {
  return errors.flatMap((e) => {
    const field = !parent
      ? e.property
      : /^\d+$/.test(e.property)
        ? `${parent}[${e.property}]`
        : `${parent}.${e.property}`;
    const own = Object.entries(e.constraints ?? {}).map(
      ([constraint, message]) => ({
        field,
        code: toCode(constraint),
        message,
      }),
    );
    return [...own, ...flattenValidationErrors(e.children ?? [], field)];
  });
}

/** ValidationPipe exceptionFactory. */
export const validationExceptionFactory = (errors: ClassValidatorError[]) =>
  new ValidationError(
    ErrorCode.VALIDATION_ERROR,
    'Some fields need fixing.',
    flattenValidationErrors(errors),
  );

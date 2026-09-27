import type { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './validation';

const err = (
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
) => ({ property, constraints, children }) as ValidationError;

describe('flattenValidationErrors', () => {
  it('builds dotted and indexed paths and maps constraint codes', () => {
    const errors = [
      err('productName', { isNotEmpty: 'Product name is required.' }),
      err('coverage', undefined, [
        err('covered', undefined, [err('2', { maxLength: 'Too long.' })]),
      ]),
      err('proofOfPurchase', undefined, [
        err('0', undefined, [err('id', { isUuid: 'Bad id.' })]),
      ]),
      err('customThing', { isPostalCode: 'Bad postcode.' }),
    ];
    expect(flattenValidationErrors(errors)).toEqual([
      {
        field: 'productName',
        code: 'REQUIRED',
        message: 'Product name is required.',
      },
      { field: 'coverage.covered[2]', code: 'TOO_LONG', message: 'Too long.' },
      {
        field: 'proofOfPurchase[0].id',
        code: 'INVALID_UUID',
        message: 'Bad id.',
      },
      {
        field: 'customThing',
        code: 'INVALID_POSTAL_CODE',
        message: 'Bad postcode.',
      },
    ]);
  });
});

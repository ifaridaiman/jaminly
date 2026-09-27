import { addMonths, isYmd } from './expiry';

describe('addMonths (same cases as the UI status.check.ts)', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-09-26', 12, '2027-09-26'],
    ['2026-11-15', 3, '2027-02-15'],
    ['2026-03-31', 1, '2026-04-30'],
    ['2026-12-31', 600, '2076-12-31'],
  ])('%s + %i months = %s', (from, months, expected) => {
    expect(addMonths(from, months)).toBe(expected);
  });
});

describe('isYmd', () => {
  it('accepts real calendar dates only', () => {
    expect(isYmd('2026-02-28')).toBe(true);
    expect(isYmd('2028-02-29')).toBe(true);
    expect(isYmd('2026-02-29')).toBe(false);
    expect(isYmd('2026-2-3')).toBe(false);
    expect(isYmd('2026-02-28T00:00:00Z')).toBe(false);
    expect(isYmd(20260228)).toBe(false);
  });
});

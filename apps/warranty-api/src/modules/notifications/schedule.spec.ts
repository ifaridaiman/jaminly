import { isValidTimeZone, localTimeToUtc, planReminders } from './schedule';

describe('localTimeToUtc', () => {
  it.each([
    ['2026-10-08', 'Asia/Kuala_Lumpur', '2026-10-08T01:00:00.000Z'], // UTC+8, no DST
    ['2026-10-08', 'UTC', '2026-10-08T09:00:00.000Z'],
    ['2026-01-15', 'America/New_York', '2026-01-15T14:00:00.000Z'], // EST, UTC−5
    ['2026-07-15', 'America/New_York', '2026-07-15T13:00:00.000Z'], // EDT, UTC−4
    ['2026-03-28', 'Europe/London', '2026-03-28T09:00:00.000Z'], // GMT, day before DST
    ['2026-03-29', 'Europe/London', '2026-03-29T08:00:00.000Z'], // BST starts 01:00 that day
    ['2026-10-25', 'Europe/London', '2026-10-25T09:00:00.000Z'], // back to GMT
    ['2026-10-08', 'Asia/Kolkata', '2026-10-08T03:30:00.000Z'], // UTC+5:30
    ['2026-10-08', 'Pacific/Kiritimati', '2026-10-07T19:00:00.000Z'], // UTC+14, previous UTC day
  ])('09:00 on %s in %s = %s', (ymd, tz, expected) => {
    expect(localTimeToUtc(ymd, 9, tz).toISOString()).toBe(expected);
  });
});

describe('planReminders', () => {
  const now = new Date('2026-09-26T12:00:00Z');

  it('one per offset, 09:00 local on expiry − offset, past ones skipped, sorted', () => {
    const plan = planReminders(
      '2026-10-08',
      [30, 7, 0, 7],
      'Asia/Kuala_Lumpur',
      now,
    );
    expect(plan).toEqual([
      { offsetDays: 7, sendAt: new Date('2026-10-01T01:00:00Z') },
      { offsetDays: 0, sendAt: new Date('2026-10-08T01:00:00Z') },
    ]);
  });

  it('today at 09:00 already passed → skipped; later today → kept', () => {
    expect(planReminders('2026-09-26', [0], 'Asia/Kuala_Lumpur', now)).toEqual(
      [],
    ); // 01:00Z < 12:00Z
    expect(
      planReminders(
        '2026-09-26',
        [0],
        'America/New_York',
        new Date('2026-09-26T12:00:00Z'),
      ),
    ).toEqual([{ offsetDays: 0, sendAt: new Date('2026-09-26T13:00:00Z') }]);
  });

  it('empty offsets = reminders off', () => {
    expect(planReminders('2027-01-01', [], 'UTC', now)).toEqual([]);
  });
});

describe('isValidTimeZone', () => {
  it('accepts IANA names only', () => {
    expect(isValidTimeZone('Asia/Kuala_Lumpur')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});

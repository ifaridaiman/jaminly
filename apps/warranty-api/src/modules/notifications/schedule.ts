// When reminders fire: 09:00 local time on (expiry − offset days), as a UTC instant. Intl only, no date library.

export const SEND_HOUR = 9;
const DAY_MS = 86_400_000;

/** Minutes the zone is ahead of UTC at `instant` (e.g. +480 for Asia/Kuala_Lumpur). */
function zoneOffsetMinutes(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / 60_000);
}

/** The UTC instant of `hour`:00 local time on `ymd` in `timeZone`. Handles DST by checking the offset twice. */
export function localTimeToUtc(
  ymd: string,
  hour: number,
  timeZone: string,
): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const wallClock = Date.UTC(y, m - 1, d, hour);
  let instant = wallClock - zoneOffsetMinutes(wallClock, timeZone) * 60_000;
  instant = wallClock - zoneOffsetMinutes(instant, timeZone) * 60_000;
  return new Date(instant);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** One entry per offset still in the future. Duplicate offsets collapse. */
export function planReminders(
  expiryYmd: string,
  offsetsDays: number[],
  timeZone: string,
  now = new Date(),
): { offsetDays: number; sendAt: Date }[] {
  const expiry = Date.parse(`${expiryYmd}T00:00:00Z`);
  return [...new Set(offsetsDays)]
    .map((offsetDays) => {
      const day = new Date(expiry - offsetDays * DAY_MS)
        .toISOString()
        .slice(0, 10);
      return { offsetDays, sendAt: localTimeToUtc(day, SEND_HOUR, timeZone) };
    })
    .filter((r) => r.sendAt.getTime() > now.getTime())
    .sort((a, b) => a.sendAt.getTime() - b.sendAt.getTime());
}

// Calendar dates as "YYYY-MM-DD" strings, computed in UTC so no timezone can shift them.

export function isYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Same rule as the UI's addMonths: clamp to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" ↔ the Date Prisma uses for @db.Date columns (UTC midnight). */
export const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
export const dateToYmd = (date: Date) => date.toISOString().slice(0, 10);

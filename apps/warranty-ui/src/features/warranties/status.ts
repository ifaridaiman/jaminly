import type { Warranty } from '@/lib/api';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired';
export type SortKey = 'expiry' | 'created' | 'updated';

const EXPIRING_SOON_DAYS = 30;
const DAY = 86_400_000;

export function localDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Adds months to a YYYY-MM-DD date, clamping to month end (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(ymd: string, months: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  const first = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysUntil(ymd: string, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((localDate(ymd).getTime() - start.getTime()) / DAY);
}

export function getStatus(expiryDate: string, today = new Date()): WarrantyStatus {
  const days = daysUntil(expiryDate, today);
  if (days < 0) return 'expired';
  return days <= EXPIRING_SOON_DAYS ? 'expiring_soon' : 'active';
}

export function expiryLabel(expiryDate: string, today = new Date()) {
  const days = daysUntil(expiryDate, today);
  if (days === 0) return 'Expires today';
  if (days < 0) return days > -60 ? `Expired ${-days} day${days === -1 ? '' : 's'} ago` : `Expired ${formatDate(expiryDate)}`;
  return days <= 60 ? `Expires in ${days} day${days === 1 ? '' : 's'}` : `Until ${formatDate(expiryDate)}`;
}

/** Short badge text: "12 days left", "Expires today", "Active", "Expired". */
export function badgeLabel(expiryDate: string, today = new Date()) {
  const days = daysUntil(expiryDate, today);
  const status = getStatus(expiryDate, today);
  if (status !== 'expiring_soon') return status === 'active' ? 'Active' : 'Expired';
  return days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`;
}

/** [30, 7, 0] → "30 d, 7 d, on the day". */
export const formatReminders = (days: number[]) =>
  [...days].sort((a, b) => b - a).map((d) => (d === 0 ? 'on the day' : `${d} d`)).join(', ') || 'Off';

export function formatDate(ymd: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(localDate(ymd));
}

/** Share of the warranty period already used, 0–100. */
export function percentUsed(purchaseDate: string, expiryDate: string, today = new Date()) {
  const total = daysUntil(expiryDate, localDate(purchaseDate));
  if (total <= 0) return 100;
  const used = total - daysUntil(expiryDate, today);
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

/** expiry: soonest to expire first, expired at the bottom (most recently expired first). */
export function sortWarranties(list: Warranty[], key: SortKey, today = new Date()) {
  const byTimeDesc = (a: string, b: string) => b.localeCompare(a);
  return [...list].sort((a, b) => {
    if (key === 'created') return byTimeDesc(a.createdAt, b.createdAt);
    if (key === 'updated') return byTimeDesc(a.updatedAt, b.updatedAt);
    const aExpired = daysUntil(a.expiryDate, today) < 0;
    const bExpired = daysUntil(b.expiryDate, today) < 0;
    if (aExpired !== bExpired) return aExpired ? 1 : -1;
    return aExpired ? byTimeDesc(a.expiryDate, b.expiryDate) : a.expiryDate.localeCompare(b.expiryDate);
  });
}

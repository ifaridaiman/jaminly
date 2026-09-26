import type { WarrantyInput } from '@/lib/api';

export const MAX_PROOF_FILES = 5;
export const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];

export type WarrantyErrors = Partial<Record<'productName' | 'purchaseDate' | 'warrantyMonths' | 'proofOfPurchase', string>>;

export function isValidDate(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function validateWarranty(w: WarrantyInput): WarrantyErrors {
  const errors: WarrantyErrors = {};
  if (!w.productName.trim()) errors.productName = 'Product name is required';
  if (!isValidDate(w.purchaseDate)) errors.purchaseDate = 'Enter a valid date (YYYY-MM-DD)';
  if (!Number.isInteger(w.warrantyMonths) || w.warrantyMonths < 1 || w.warrantyMonths > 600)
    errors.warrantyMonths = 'Enter a number of months between 1 and 600';
  if (w.proofOfPurchase.length === 0) errors.proofOfPurchase = 'Add a proof of purchase to save';
  else if (w.proofOfPurchase.length > MAX_PROOF_FILES) errors.proofOfPurchase = `Up to ${MAX_PROOF_FILES} files`;
  else if (w.proofOfPurchase.some((a) => a.sizeBytes > MAX_PROOF_BYTES)) errors.proofOfPurchase = 'Each file must be 10 MB or smaller';
  else if (w.proofOfPurchase.some((a) => !PROOF_TYPES.includes(a.mimeType)))
    errors.proofOfPurchase = 'Use JPG, PNG, HEIC or PDF files';
  return errors;
}

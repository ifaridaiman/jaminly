// @ts-nocheck -- plain Node script (node:assert, .ts import), not part of the app bundle.
// Run: node src/features/warranties/status.check.ts
import assert from 'node:assert/strict';

import { addMonths, daysUntil, expiryLabel, getStatus, sortWarranties } from './status.ts';
import { isValidDate, validateWarranty } from './validate.ts';

const today = new Date(2026, 8, 26); // 26 Sep 2026
assert.equal(daysUntil('2026-09-26', today), 0);
assert.equal(daysUntil('2026-10-26', today), 30);
assert.equal(getStatus('2026-09-25', today), 'expired');
assert.equal(getStatus('2026-09-26', today), 'expiring_soon');
assert.equal(getStatus('2026-10-26', today), 'expiring_soon');
assert.equal(getStatus('2026-10-27', today), 'active');
assert.equal(expiryLabel('2026-09-26', today), 'Expires today');
assert.equal(expiryLabel('2026-09-27', today), 'Expires in 1 day');
assert.equal(expiryLabel('2026-09-23', today), 'Expired 3 days ago');

const w = (id: string, expiryDate: string, createdAt: string, updatedAt: string) =>
  ({ id, expiryDate, createdAt, updatedAt }) as never;
const list = [
  w('expired-old', '2026-01-01', '2026-03-01', '2026-09-01'),
  w('later', '2027-05-01', '2026-01-01', '2026-02-01'),
  w('expired-recent', '2026-09-01', '2026-02-01', '2026-01-01'),
  w('soon', '2026-10-01', '2026-04-01', '2026-03-01'),
];
const ids = (key: 'expiry' | 'created' | 'updated') => sortWarranties(list, key, today).map((x) => x.id);
assert.deepEqual(ids('expiry'), ['soon', 'later', 'expired-recent', 'expired-old']);
assert.deepEqual(ids('created'), ['soon', 'expired-old', 'expired-recent', 'later']);
assert.deepEqual(ids('updated'), ['expired-old', 'soon', 'later', 'expired-recent']);
console.log('status checks passed');

assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
assert.equal(addMonths('2026-09-26', 12), '2027-09-26');
assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
assert.equal(isValidDate('2026-02-30'), false);
assert.equal(isValidDate('2026-2-3'), false);
assert.equal(isValidDate('2026-02-28'), true);
const proof = { mimeType: 'image/jpeg', sizeBytes: 1000 };
const valid = { productName: 'TV', purchaseDate: '2026-01-01', warrantyMonths: 12, proofOfPurchase: [proof] } as never;
assert.deepEqual(validateWarranty(valid), {});
assert.deepEqual(
  Object.keys(validateWarranty({ productName: ' ', purchaseDate: 'x', warrantyMonths: 0, proofOfPurchase: [] } as never)).sort(),
  ['productName', 'proofOfPurchase', 'purchaseDate', 'warrantyMonths'],
);
const proofError = (files: object[]) => validateWarranty({ ...(valid as object), proofOfPurchase: files } as never).proofOfPurchase;
assert.equal(proofError(Array(6).fill(proof)), 'Up to 5 files');
assert.equal(proofError([{ ...proof, sizeBytes: 11 * 1024 * 1024 }]), 'Each file must be 10 MB or smaller');
assert.equal(proofError([{ ...proof, mimeType: 'video/mp4' }]), 'Use JPG, PNG, HEIC or PDF files');
assert.equal(proofError([{ ...proof, mimeType: 'application/pdf' }]), undefined);
console.log('validate checks passed');

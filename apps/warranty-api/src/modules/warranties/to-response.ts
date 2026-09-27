import type { Attachment, Warranty } from '../../generated/prisma/client';
import type { AttachmentDto } from '../attachments';
import { dateToYmd } from './expiry';
import type { WarrantyDto } from './warranty.dto';

/** DB row → the UI's Warranty shape. Never returns a Prisma row, so internal columns can't leak. */
export function toWarrantyDto(
  w: Warranty & { attachments: Attachment[] },
  signed: AttachmentDto[],
): WarrantyDto {
  return {
    id: w.id,
    productName: w.productName,
    ...(w.brand && { brand: w.brand }),
    ...(w.model && { model: w.model }),
    ...(w.serialNumber && { serialNumber: w.serialNumber }),
    category: w.category,
    ...(w.store && { store: w.store }),
    purchaseDate: dateToYmd(w.purchaseDate),
    ...(w.priceAmount !== null &&
      w.priceCurrency && {
        price: { amount: w.priceAmount.toNumber(), currency: w.priceCurrency },
      }),
    warrantyMonths: w.warrantyMonths,
    expiryDate: dateToYmd(w.expiryDate),
    coverage: {
      covered: w.covered,
      notCovered: w.notCovered,
      ...(w.coverageNotes && { notes: w.coverageNotes }),
    },
    proofOfPurchase: signed,
    reminderOffsetsDays: w.reminderOffsetsDays,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

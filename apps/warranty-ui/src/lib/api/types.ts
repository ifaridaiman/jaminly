export type Category = 'electronics' | 'appliance' | 'furniture' | 'vehicle' | 'other';

export type Attachment = { id: string; url: string; mimeType: string; sizeBytes: number; name?: string };

export type Warranty = {
  id: string;
  productName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: Category;
  store?: string;
  purchaseDate: string; // YYYY-MM-DD
  price?: { amount: number; currency: string };
  warrantyMonths: number;
  expiryDate: string; // YYYY-MM-DD
  coverage: { covered: string[]; notCovered: string[]; notes?: string };
  proofOfPurchase: Attachment[];
  reminderOffsetsDays: number[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

export type WarrantyInput = Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>;

export interface ApiClient {
  listWarranties(): Promise<Warranty[]>;
  getWarranty(id: string): Promise<Warranty>;
  createWarranty(input: WarrantyInput): Promise<Warranty>;
  updateWarranty(id: string, input: WarrantyInput): Promise<Warranty>;
  deleteWarranty(id: string): Promise<void>;
  /** Emails a one-time code to the signed-in user. The code never reaches the app. */
  requestAccountDeletion(): Promise<{ email: string; resendAfterSeconds: number }>;
  /** Deletes the account and all its data if `code` matches the emailed one. */
  confirmAccountDeletion(code: string): Promise<void>;
}

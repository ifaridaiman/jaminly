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
}

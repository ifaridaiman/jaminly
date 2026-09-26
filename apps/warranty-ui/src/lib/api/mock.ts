import type { ApiClient, Category, Warranty } from './types';

const delay = () => new Promise((r) => setTimeout(r, 300)); // fake latency so loading states are visible

const DAY = 86_400_000;
const isoDate = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
const isoTime = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

function seed(
  id: string,
  productName: string,
  brand: string,
  category: Category,
  store: string,
  purchasedDaysAgo: number,
  warrantyMonths: number,
  updatedDaysAgo: number,
): Warranty {
  const expiryDays = Math.round(warrantyMonths * 30.44) - purchasedDaysAgo;
  return {
    id,
    productName,
    brand,
    category,
    store,
    purchaseDate: isoDate(-purchasedDaysAgo),
    warrantyMonths,
    expiryDate: isoDate(expiryDays),
    coverage: { covered: ['Parts', 'Labour'], notCovered: ['Accidental damage'] },
    proofOfPurchase: [{ id: `${id}-r1`, url: '', mimeType: 'image/jpeg', sizeBytes: 0 }],
    reminderOffsetsDays: [30, 7, 0],
    createdAt: isoTime(-purchasedDaysAgo + 1),
    updatedAt: isoTime(-updatedDaysAgo),
  };
}

// Dates are relative to today so every status shows up in the list.
const warranties: Warranty[] = [
  seed('w1', 'Samsung 55" QLED TV', 'Samsung', 'electronics', 'Harvey Norman', 353, 12, 40),
  seed('w2', 'MacBook Air M3', 'Apple', 'electronics', 'Apple Store', 200, 12, 2),
  seed('w3', 'Dyson V15 Detect', 'Dyson', 'appliance', 'Dyson Demo Store', 700, 24, 300),
  seed('w4', 'Panasonic Inverter Aircond', 'Panasonic', 'appliance', 'Senheng', 20, 36, 20),
  seed('w5', 'IKEA Markus Chair', 'IKEA', 'furniture', 'IKEA Cheras', 3700, 120, 5),
  seed('w6', 'Sony WH-1000XM5', 'Sony', 'electronics', 'Sony Centre', 380, 12, 100),
];

export const mockApi: ApiClient = {
  async listWarranties() {
    await delay();
    return structuredClone(warranties);
  },
  async getWarranty(id) {
    await delay();
    const found = warranties.find((w) => w.id === id);
    if (!found) throw new Error('Warranty not found');
    return structuredClone(found);
  },
  // ponytail: attachments keep their local URI. Real API uploads them on save (POST /uploads) at M2.
  async createWarranty(input) {
    await delay();
    const now = new Date().toISOString();
    const created: Warranty = { ...structuredClone(input), id: `w${Date.now().toString(36)}`, createdAt: now, updatedAt: now };
    warranties.push(created);
    return structuredClone(created);
  },
  // ponytail: in-memory only, edits reset on reload. Persist to AsyncStorage if that gets annoying before M2.
  async updateWarranty(id, input) {
    await delay();
    const i = warranties.findIndex((w) => w.id === id);
    if (i === -1) throw new Error('Warranty not found');
    warranties[i] = { ...warranties[i], ...structuredClone(input), updatedAt: new Date().toISOString() };
    return structuredClone(warranties[i]);
  },
};

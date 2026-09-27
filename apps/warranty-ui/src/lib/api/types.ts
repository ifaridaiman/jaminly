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

export type User = { id: string; email: string; name: string; avatarUrl?: string };

/** Result of any successful sign-in. */
export type AuthSession = { user: User; accessToken: string; refreshToken: string };

/** An emailed code went out (or would have, for an email we won't confirm exists). */
export type CodeSent = { email: string; resendAfterSeconds: number };

/** Sign-in and account calls. Always the real API (http.ts). */
export interface AuthApi {
  /** Creates an unverified account and emails a code. Sign-in happens in `verifyEmail`. */
  register(input: { name: string; email: string; password: string }): Promise<CodeSent>;
  resendVerification(email: string): Promise<CodeSent>;
  verifyEmail(email: string, code: string): Promise<AuthSession>;
  /** Throws ApiError EMAIL_NOT_VERIFIED (and emails a new code) for an unverified account. */
  login(email: string, password: string): Promise<AuthSession>;
  signInWithGoogle(idToken: string): Promise<AuthSession>;
  forgotPassword(email: string): Promise<CodeSent>;
  resetPassword(email: string, code: string, password: string): Promise<AuthSession>;
  /** Signs back in with the stored refresh token (app start). null = signed out. */
  restoreSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
  /** Emails a one-time code to the signed-in user. The code never reaches the app. */
  requestAccountDeletion(): Promise<CodeSent>;
  /** Deletes the account and all its data if `code` matches the emailed one. */
  confirmAccountDeletion(code: string): Promise<void>;
}

/** Warranty calls. Mock (mock.ts) until the API's warranty endpoints land (M2). */
export interface WarrantyApi {
  listWarranties(): Promise<Warranty[]>;
  getWarranty(id: string): Promise<Warranty>;
  createWarranty(input: WarrantyInput): Promise<Warranty>;
  updateWarranty(id: string, input: WarrantyInput): Promise<Warranty>;
  deleteWarranty(id: string): Promise<void>;
}

export type ApiClient = AuthApi & WarrantyApi;

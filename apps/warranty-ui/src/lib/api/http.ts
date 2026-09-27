import { env } from '@/lib/env';
import { storage } from '@/lib/storage';

import { ApiError } from './errors';
import type { Attachment, AuthApi, AuthSession, Warranty, WarrantyApi, WarrantyInput } from './types';

const REFRESH_TOKEN_KEY = 'jaminly.refreshToken';

// The access token lives only in memory (15 min). The refresh token is persisted to restore sessions.
let accessToken: string | null = null;
let refreshing: Promise<AuthSession | null> | null = null;
let sessionEnded: () => void = () => {};

/** Called when a refresh fails mid-session (revoked, expired, account deleted), so the UI can sign out. */
export function onSessionEnded(callback: () => void) {
  sessionEnded = callback;
}

async function saveTokens(session: AuthSession) {
  accessToken = session.accessToken;
  await storage.set(REFRESH_TOKEN_KEY, session.refreshToken);
  return session;
}

async function clearTokens() {
  accessToken = null;
  await storage.remove(REFRESH_TOKEN_KEY);
}

type Envelope<T> = {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  errors: { field?: string; code: string; message: string }[];
};

function toApiError(body: Envelope<unknown> | null, status: number): ApiError {
  if (!body) return new ApiError(`HTTP_${status}`, 'Something went wrong. Please try again.');
  const fields: Record<string, string> = {};
  for (const e of body.errors ?? []) if (e.field && !fields[e.field]) fields[e.field] = e.message;
  return new ApiError(body.code, body.message, fields);
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  { auth = true, retry = true } = {},
): Promise<T> {
  if (!env.apiBaseUrl) throw new ApiError('API_NOT_CONFIGURED', 'EXPO_PUBLIC_API_BASE_URL is not set.');

  let res: Response;
  try {
    res = await fetch(env.apiBaseUrl + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(auth && accessToken && { authorization: `Bearer ${accessToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', "Can't reach the Jaminly server. Check your connection and try again.");
  }

  // Expired access token: refresh once and replay. If that fails, the session is over.
  if (res.status === 401 && auth && retry) {
    if (await restoreSession()) return request<T>(method, path, body, { auth, retry: false });
    sessionEnded();
  }

  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) throw toApiError(json, res.status);
  return json.data as T;
}

/**
 * Swaps the stored refresh token for a fresh session. Used on app start and after a 401.
 * Concurrent callers share one request, because each refresh token works exactly once.
 */
function restoreSession(): Promise<AuthSession | null> {
  refreshing ??= (async () => {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
      return await saveTokens(await request<AuthSession>('POST', '/auth/refresh', { refreshToken }, { auth: false }));
    } catch (e) {
      // Offline: keep the token and try again next time. Anything else means it's dead.
      if (!(e instanceof ApiError && e.code === 'NETWORK_ERROR')) await clearTokens();
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const post = <T>(path: string, body: unknown) => request<T>('POST', path, body, { auth: false });
const signedIn = async (session: Promise<AuthSession>) => saveTokens(await session);

export const httpAuthApi: AuthApi = {
  register: (input) => post('/auth/register', input),
  resendVerification: (email) => post('/auth/verify-email/resend', { email }),
  verifyEmail: (email, code) => signedIn(post('/auth/verify-email', { email, code })),
  login: (email, password) => signedIn(post('/auth/login', { email, password })),
  signInWithGoogle: (idToken) => signedIn(post('/auth/google', { idToken })),
  forgotPassword: (email) => post('/auth/password/forgot', { email }),
  resetPassword: (email, code, password) => signedIn(post('/auth/password/reset', { email, code, password })),
  restoreSession,
  async logout() {
    const refreshToken = await storage.get(REFRESH_TOKEN_KEY);
    await clearTokens();
    // Best effort: signing out locally must work offline too.
    if (refreshToken) await post('/auth/logout', { refreshToken }).catch(() => undefined);
  },
  getNotificationSettings: () => request('GET', '/me/notification-settings'),
  saveNotificationSettings: (settings) => request('PUT', '/me/notification-settings', settings),
  registerPushToken: (token, platform) => request('POST', '/me/push-tokens', { token, provider: 'expo', platform }),
  removePushToken: (token) => request('DELETE', `/me/push-tokens/${encodeURIComponent(token)}`),
  requestAccountDeletion: () => request('POST', '/me/deletion'),
  confirmAccountDeletion: (code) => request('DELETE', '/me', { code }),
};

// ── Warranties ──

/** Picked-but-not-uploaded files carry a device URI (file:, content:, blob:, ph:); uploaded ones a signed https URL. */
const isLocal = (a: Attachment) => !/^https?:\/\//.test(a.url);

/** POST /uploads, then PUT the bytes straight to storage with the returned URL and headers. */
async function uploadProof(file: Attachment): Promise<Attachment> {
  let blob: Blob;
  try {
    blob = await (await fetch(file.url)).blob();
  } catch {
    throw new ApiError('FILE_UNREADABLE', "Couldn't read one of the receipts. Remove it and add it again.");
  }
  const { attachment, uploadUrl, headers } = await request<{
    attachment: Attachment;
    uploadUrl: string;
    headers: Record<string, string>;
  }>('POST', '/uploads', { mimeType: file.mimeType, sizeBytes: blob.size, ...(file.name && { name: file.name }) });
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
  } catch {
    throw new ApiError('NETWORK_ERROR', "Couldn't upload a receipt. Check your connection and try again.");
  }
  if (!res.ok) throw new ApiError('UPLOAD_FAILED', "Couldn't upload a receipt. Please try again.");
  return attachment;
}

/**
 * The body the API accepts. On edit (`forUpdate`) cleared optional fields are sent as "" / null,
 * because PATCH treats a missing field as "leave unchanged".
 */
async function toBody(input: WarrantyInput, forUpdate: boolean) {
  const proof = await Promise.all(input.proofOfPurchase.map((a) => (isLocal(a) ? uploadProof(a) : a)));
  const text = (v?: string) => v ?? (forUpdate ? '' : undefined);
  return {
    productName: input.productName,
    brand: text(input.brand),
    model: text(input.model),
    serialNumber: text(input.serialNumber),
    category: input.category,
    store: text(input.store),
    purchaseDate: input.purchaseDate,
    price: input.price ?? (forUpdate ? null : undefined),
    warrantyMonths: input.warrantyMonths,
    ...(input.expiryDate && { expiryDate: input.expiryDate }),
    coverage: { ...input.coverage, notes: input.coverage.notes ?? (forUpdate ? '' : undefined) },
    proofOfPurchase: proof.map((a) => ({ id: a.id })),
    reminderOffsetsDays: input.reminderOffsetsDays,
  };
}

export const httpWarrantyApi: WarrantyApi = {
  listWarranties: () => request<Warranty[]>('GET', '/warranties'),
  getWarranty: (id) => request<Warranty>('GET', `/warranties/${id}`),
  createWarranty: async (input) => request<Warranty>('POST', '/warranties', await toBody(input, false)),
  updateWarranty: async (id, input) => request<Warranty>('PATCH', `/warranties/${id}`, await toBody(input, true)),
  deleteWarranty: (id) => request<void>('DELETE', `/warranties/${id}`),
};

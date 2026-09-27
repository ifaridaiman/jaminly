// EXPO_PUBLIC_* are inlined at build time, so they must be read with full names here.
export const env = {
  /** e.g. http://localhost:3001/api/v1 (use your machine's LAN IP on a physical phone). */
  apiBaseUrl: (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, ''),
  /** Empty = hide "Continue with Google". */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

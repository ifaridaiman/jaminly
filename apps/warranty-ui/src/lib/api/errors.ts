/** What the API client throws. Mirrors the server's error envelope (warranty-api PRD §6). */
export class ApiError extends Error {
  constructor(
    /** Stable code to branch on, e.g. EMAIL_NOT_VERIFIED, CODE_INVALID. */
    readonly code: string,
    /** Sentence written for users; show it as-is. */
    message: string,
    /** Per-field problems, keyed by field name (e.g. { password: 'Use at least 8 characters.' }). */
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** A user-facing message for anything thrown by the API client. */
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';

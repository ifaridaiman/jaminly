// Same rules as warranty-api's auth DTOs, so most mistakes are caught before a round trip.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string) {
  if (!email.trim()) return 'Enter your email.';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address.';
}

export function newPasswordError(password: string) {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Use 128 characters or fewer.';
}

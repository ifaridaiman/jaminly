/**
 * SecureStore has no web version. localStorage is readable by any script on the page, so an XSS bug
 * could steal the refresh token. ponytail: move to an http-only cookie when the API is served same-site.
 */
export const storage = {
  get: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null; // private mode / storage blocked
    }
  },
  set: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  remove: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

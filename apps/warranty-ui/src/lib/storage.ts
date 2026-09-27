import * as SecureStore from 'expo-secure-store';

/** Small secrets (the refresh token). Keychain on iOS, Keystore-backed on Android. */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};

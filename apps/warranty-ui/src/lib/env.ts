// EXPO_PUBLIC_* are inlined at build time, so they must be read with full names here.
export const env = {
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false',
  mockAuth: process.env.EXPO_PUBLIC_MOCK_AUTH !== 'false',
  localReminders: process.env.EXPO_PUBLIC_LOCAL_REMINDERS !== 'false',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};

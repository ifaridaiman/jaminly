// Web has no push: reminders reach web users by email and the in-app "Expiring soon" list.
export const registerForPush = async (_options: { prompt: boolean }): Promise<string | null> => null;
export const unregisterPush = async (): Promise<void> => {};
export function useNotificationTaps() {}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

// Reminders arriving while the app is open still show as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let registeredToken: string | null = null;

/**
 * Gets this device's Expo push token and sends it to the API.
 * `prompt: false` only refreshes the token if permission was already granted (app start).
 * Returns null when push isn't possible: simulator, no EAS project yet, permission denied, offline.
 */
export async function registerForPush({ prompt }: { prompt: boolean }): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  // ponytail: silent until the app has an EAS project (`eas init`) and runs on a real device.
  if (!projectId || !Device.isDevice) return null;
  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Warranty reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && prompt) ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
    return token;
  } catch {
    return null; // Expo's token service or our API unreachable; the next app start retries
  }
}

/** On sign-out, so the next person to use this device doesn't get the previous user's reminders. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await api.removePushToken(token).catch(() => undefined);
}

/** Opens the warranty when a reminder is tapped (payload `data.url` = jaminly://warranty/<id>). */
export function useNotificationTaps() {
  useEffect(() => {
    function open(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('jaminly://warranty/'))
        router.push(`/warranty/${url.slice('jaminly://warranty/'.length)}` as never);
    }
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, []);
}

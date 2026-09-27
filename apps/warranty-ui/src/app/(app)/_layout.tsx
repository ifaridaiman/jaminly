import { Stack } from 'expo-router';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';

import { registerForPush, useNotificationTaps } from '@/features/notifications/push';
import { useSettings } from '@/features/settings/settings-provider';
import { useTheme } from '@/hooks/use-theme';

// Pop-up sheets: iOS page sheet, Android full-screen modal, web dialog (desktop) or bottom sheet (phone).
// Web needs EXPO_UNSTABLE_WEB_MODAL=1 (see .env); without it these open as normal pages.
const popup: ComponentProps<typeof Stack.Screen>['options'] = {
  presentation: 'modal',
  headerShown: false,
  sheetAllowedDetents: [0.94],
};

export default function AppLayout() {
  const theme = useTheme();
  const { push } = useSettings();
  useNotificationTaps();
  // Signed in: refresh this device's push token if permission was already given. The prompt itself
  // waits until the first warranty is saved, when the reason for it is obvious.
  useEffect(() => {
    if (push) void registerForPush({ prompt: false });
  }, [push]);

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Warranties' }} />
      <Stack.Screen name="warranty/[id]/index" options={popup} />
      <Stack.Screen name="warranty/new" options={popup} />
      <Stack.Screen name="warranty/[id]/edit" options={popup} />
      <Stack.Screen name="delete-account" options={popup} />
      <Stack.Screen name="warranty/[id]/receipt" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

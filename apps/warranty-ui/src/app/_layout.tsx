import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { SettingsProvider } from '@/features/settings/settings-provider';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { user } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

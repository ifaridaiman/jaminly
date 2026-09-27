import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        title: '',
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
      }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

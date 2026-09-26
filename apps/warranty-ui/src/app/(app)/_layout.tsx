import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

function AddButton() {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add warranty" hitSlop={12} onPress={() => router.push('/warranty/new')}>
      <ThemedText style={{ color: theme.primary, fontSize: 28, lineHeight: 32, paddingHorizontal: 8 }}>+</ThemedText>
    </Pressable>
  );
}

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Warranties', headerLargeTitle: true, headerRight: () => <AddButton /> }}
      />
      <Stack.Screen name="warranty/new" options={{ title: 'New warranty', presentation: 'modal' }} />
      <Stack.Screen name="warranty/[id]/edit" options={{ title: 'Edit warranty', presentation: 'modal' }} />
    </Stack>
  );
}

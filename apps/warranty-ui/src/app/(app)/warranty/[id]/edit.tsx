import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { WarrantyForm } from '@/features/warranties/components/warranty-form';
import { useUpdateWarranty, useWarranty } from '@/features/warranties/hooks';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, errorMessage } from '@/lib/api';

export default function EditWarrantyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, isPending, isError, refetch } = useWarranty(id);
  const update = useUpdateWarranty(id);

  if (isPending || isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {isPending ? (
          <ActivityIndicator accessibilityLabel="Loading warranty" />
        ) : (
          <>
            <ThemedText>Couldn&apos;t load this warranty.</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => refetch()}>
              <ThemedText style={{ color: theme.primary }}>Retry</ThemedText>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <WarrantyForm
      title="Edit warranty"
      key={data.id}
      initial={data}
      saving={update.isPending}
      saveError={update.error ? `${errorMessage(update.error)} Your changes are still here.` : undefined}
      serverErrors={update.error instanceof ApiError ? update.error.fields : undefined}
      onSubmit={(input) => update.mutate(input, { onSuccess: () => router.back() })}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
});

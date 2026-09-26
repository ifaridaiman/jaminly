import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { WarrantyCard } from '@/features/warranties/components/warranty-card';
import { useWarranties } from '@/features/warranties/hooks';
import { sortWarranties, type SortKey } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'expiry', label: 'Expiring first' },
  { key: 'created', label: 'Latest created' },
  { key: 'updated', label: 'Last updated' },
];

export default function DashboardScreen() {
  const theme = useTheme();
  const { data, isPending, isError, refetch, isRefetching } = useWarranties();
  const [sort, setSort] = useState<SortKey>('expiry');

  if (isPending) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel="Loading warranties" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Couldn&apos;t load your warranties.</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => refetch()}>
          <ThemedText style={{ color: theme.primary }}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      data={sortWarranties(data, sort)}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => <WarrantyCard warranty={item} />}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={
        <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Sort by">
          {SORTS.map(({ key, label }) => {
            const selected = key === sort;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSort(key)}
                style={[
                  styles.chip,
                  { borderColor: selected ? theme.primary : theme.border },
                  selected && { backgroundColor: theme.primary },
                ]}>
                <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <ThemedText style={styles.emptyTitle}>No warranties yet</ThemedText>
          <ThemedText themeColor="textSecondary">Snap a receipt to start tracking.</ThemedText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/warranty/new')} style={styles.emptyAction}>
            <ThemedText style={{ color: theme.primary }}>Add warranty</ThemedText>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 18, borderWidth: 1 },
  empty: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.six },
  emptyTitle: { fontSize: 17, fontWeight: 600 },
  emptyAction: { minHeight: 44, justifyContent: 'center' },
});

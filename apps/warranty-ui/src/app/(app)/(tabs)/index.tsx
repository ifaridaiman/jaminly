import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReceiptSketch } from '@/components/receipt-sketch';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { WarrantyCard } from '@/features/warranties/components/warranty-card';
import { useWarranties } from '@/features/warranties/hooks';
import { getStatus, sortWarranties, type SortKey, type WarrantyStatus } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';
import type { Warranty } from '@/lib/api';

type Filter = 'all' | WarrantyStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring_soon', label: 'Expiring' },
  { key: 'expired', label: 'Expired' },
];
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'expiry', label: 'Expiring first' },
  { key: 'created', label: 'Latest created' },
  { key: 'updated', label: 'Last updated' },
];

const addWarranty = () => router.push('/warranty/new');

function matches(w: Warranty, query: string) {
  const q = query.trim().toLowerCase();
  return !q || [w.productName, w.brand, w.model, w.store].some((f) => f?.toLowerCase().includes(q));
}

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch, isRefetching } = useWarranties();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('expiry');

  const all = data ?? [];
  const counts: Record<Filter, number> = { all: all.length, active: 0, expiring_soon: 0, expired: 0 };
  all.forEach((w) => counts[getStatus(w.expiryDate)]++);

  const visible = sortWarranties(
    all.filter((w) => (filter === 'all' || getStatus(w.expiryDate) === filter) && matches(w, query)),
    sort,
  );
  const expiring = visible.filter((w) => getStatus(w.expiryDate) === 'expiring_soon');
  const others = visible.filter((w) => getStatus(w.expiryDate) !== 'expiring_soon');
  const sections = [
    { title: 'Expiring soon', data: expiring },
    { title: filter === 'all' ? `Other warranties · ${others.length}` : `${FILTERS.find((f) => f.key === filter)!.label} · ${others.length}`, data: others },
  ].filter((s) => s.data.length > 0);

  const sortLabel = SORTS.find((s) => s.key === sort)!.label;
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((s) => s.key === sort) + 1) % SORTS.length].key);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.title} accessibilityRole="header">
          Warranties
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add warranty"
          onPress={addWarranty}
          style={({ pressed }) => [styles.addButton, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor={theme.primary} />
        </Pressable>
      </View>

      {all.length > 0 && (
        <>
          <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={18} tintColor={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products, brands, stores"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Search warranties"
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup">
            {FILTERS.map(({ key, label }) => {
              const selected = key === filter;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(key)}
                  style={[styles.chip, { backgroundColor: selected ? theme.text : theme.backgroundElement }]}>
                  <ThemedText style={[styles.chipLabel, { color: selected ? theme.background : theme.text }]}>
                    {label} {counts[key]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable accessibilityRole="button" accessibilityLabel={`Sort: ${sortLabel}. Tap to change.`} onPress={nextSort} style={styles.sort}>
            <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }} size={14} tintColor={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary }}>
              {sortLabel}
            </ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );

  if (isPending || isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {isPending ? (
          <ActivityIndicator accessibilityLabel="Loading warranties" />
        ) : (
          <>
            <ThemedText>Couldn&apos;t load your warranties.</ThemedText>
            <Pressable accessibilityRole="button" onPress={() => refetch()}>
              <ThemedText style={{ color: theme.primary }}>Retry</ThemedText>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + 120 }]}
      sections={sections}
      keyExtractor={(w) => w.id}
      stickySectionHeadersEnabled={false}
      renderItem={({ item }) => <WarrantyCard warranty={item} />}
      renderSectionHeader={({ section }) => (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
          {section.title.toUpperCase()}
        </ThemedText>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={header}
      ListEmptyComponent={
        all.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyArt, { backgroundColor: theme.primary + '14' }]}>
              <View style={{ transform: [{ rotate: '-8deg' }] }}>
                <ReceiptSketch width={60} accent />
              </View>
            </View>
            <ThemedText style={styles.emptyTitle}>No warranties yet</ThemedText>
            <ThemedText themeColor="textSecondary">Snap a receipt to start tracking.</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={addWarranty}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
              <SymbolView name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }} size={20} tintColor={theme.onPrimary} />
              <ThemedText style={[styles.primaryLabel, { color: theme.onPrimary }]}>Add warranty</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.noMatches}>
            <ThemedText style={styles.emptyTitle}>No matches</ThemedText>
            <ThemedText themeColor="textSecondary">Try another search or filter.</ThemedText>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  list: { flexGrow: 1, paddingHorizontal: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { gap: Spacing.three, marginBottom: Spacing.one },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 34, lineHeight: 41, fontWeight: 700 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, height: 44, paddingHorizontal: Spacing.three, borderRadius: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 17, outlineStyle: 'none' } as object,
  chips: { gap: Spacing.two },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 18 },
  chipLabel: { fontSize: 15, lineHeight: 20, fontWeight: 500 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-end', minHeight: 32 },
  sectionTitle: { letterSpacing: 0.5, marginTop: Spacing.three, marginBottom: Spacing.two },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingBottom: Spacing.six },
  emptyArt: { width: 132, height: 132, borderRadius: 66, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  emptyTitle: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  noMatches: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.six },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.five,
    borderRadius: 12,
    marginTop: Spacing.three,
  },
  primaryLabel: { fontSize: 17, fontWeight: 600 },
});

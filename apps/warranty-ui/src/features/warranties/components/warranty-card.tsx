import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Warranty } from '@/lib/api';

import { expiryLabel, getStatus } from '../status';
import { StatusBadge } from './status-badge';

export function WarrantyCard({ warranty }: { warranty: Warranty }) {
  const theme = useTheme();
  const status = getStatus(warranty.expiryDate);
  const expiry = expiryLabel(warranty.expiryDate);
  const subtitle = [warranty.brand, warranty.store].filter(Boolean).join(' · ');

  return (
    // Not <Link asChild>: it drops Pressable's style function (pressed state) on web.
    <Pressable
      onPress={() => router.push({ pathname: '/warranty/[id]/edit', params: { id: warranty.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${warranty.productName}. ${expiry}.`}
      accessibilityHint="Opens the warranty editor"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        status === 'expired' && styles.dimmed,
      ]}>
      <View style={styles.text}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {warranty.productName}
        </ThemedText>
        {!!subtitle && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
        <ThemedText type="small">{expiry}</ThemedText>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three, borderRadius: 12 },
  dimmed: { opacity: 0.6 },
  text: { flex: 1, gap: Spacing.one },
  title: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
});

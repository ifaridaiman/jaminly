import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ReceiptSketch } from '@/components/receipt-sketch';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Warranty } from '@/lib/api';

import { badgeLabel, expiryLabel, formatDate, getStatus } from '../status';
import { CategoryIcon } from './category-icon';
import { StatusBadge } from './status-badge';

export function WarrantyCard({ warranty }: { warranty: Warranty }) {
  const theme = useTheme();
  const status = getStatus(warranty.expiryDate);
  const subtitle = [warranty.brand, warranty.store].filter(Boolean).join(' · ');
  const receipt = warranty.proofOfPurchase.find((a) => a.mimeType.startsWith('image/') && a.url);

  return (
    // Not <Link asChild>: it drops Pressable's style function (pressed state) on web.
    <Pressable
      onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: warranty.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${warranty.productName}. ${expiryLabel(warranty.expiryDate)}.`}
      accessibilityHint="Opens warranty details"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        status === 'expired' && styles.dimmed,
      ]}>
      <CategoryIcon category={warranty.category} />
      <View style={styles.text}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {warranty.productName}
        </ThemedText>
        {!!subtitle && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
        <View style={styles.meta}>
          <StatusBadge status={status} label={badgeLabel(warranty.expiryDate)} />
          <ThemedText type="small" themeColor="textSecondary">
            {status === 'expired' ? 'Ended' : 'Until'} {formatDate(warranty.expiryDate)}
          </ThemedText>
        </View>
      </View>
      {receipt ? (
        <Image source={{ uri: receipt.url }} style={[styles.thumb, { borderColor: theme.border }]} contentFit="cover" />
      ) : (
        <ReceiptSketch width={44} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 16 },
  dimmed: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: Spacing.one, marginTop: Spacing.one },
  thumb: { width: 44, height: 57, borderRadius: 4, borderWidth: 1 },
});

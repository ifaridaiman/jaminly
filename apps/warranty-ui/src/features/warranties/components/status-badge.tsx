import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import type { WarrantyStatus } from '../status';

const LABEL = { active: 'Active', expiring_soon: 'Expiring soon', expired: 'Expired' } as const;

export function StatusBadge({ status }: { status: WarrantyStatus }) {
  const theme = useTheme();
  const [fg, bg] = {
    active: [theme.success, theme.successBg],
    expiring_soon: [theme.warning, theme.warningBg],
    expired: [theme.danger, theme.dangerBg],
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="smallBold" style={{ color: fg }}>
        {LABEL[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});

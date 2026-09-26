import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import type { WarrantyStatus } from '../status';

const LABEL = { active: 'Active', expiring_soon: 'Expiring soon', expired: 'Expired' } as const;
const ICON: Record<WarrantyStatus, SymbolViewProps['name']> = {
  active: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  expiring_soon: { ios: 'clock', android: 'schedule', web: 'schedule' },
  expired: { ios: 'xmark.shield', android: 'gpp_bad', web: 'gpp_bad' },
};

export function StatusBadge({ status, label, icon = true }: { status: WarrantyStatus; label?: string; icon?: boolean }) {
  const theme = useTheme();
  const [fg, bg] = {
    active: [theme.success, theme.successBg],
    expiring_soon: [theme.warning, theme.warningBg],
    expired: [theme.danger, theme.dangerBg],
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <SymbolView name={ICON[status]} size={13} tintColor={fg} />}
      <ThemedText type="small" style={{ color: fg }}>
        {label ?? LABEL[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});

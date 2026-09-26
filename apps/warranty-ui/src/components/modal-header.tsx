import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Header drawn inside pop-up screens. Web modals don't render the Stack header,
 * so every platform uses this one to look the same.
 */
export function ModalHeader({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Android modals are full screen; iOS sheets and web pop-ups sit below the status bar already.
  const top = Platform.OS === 'android' ? insets.top : 0;

  return (
    <View style={[styles.bar, { paddingTop: top, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={[styles.side, styles.left]}>{left}</View>
      {!!title && (
        <ThemedText style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </ThemedText>
      )}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { flex: 1, flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  title: { fontSize: 17, fontWeight: 600, textAlign: 'center' },
});

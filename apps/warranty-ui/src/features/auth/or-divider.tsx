import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function OrDivider() {
  const theme = useTheme();
  const line = <View style={[styles.line, { backgroundColor: theme.border }]} />;
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {line}
      <ThemedText type="small" themeColor="textSecondary">
        or
      </ThemedText>
      {line}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});

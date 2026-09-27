import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'danger' | 'secondary';
  busy?: boolean;
};

/** Full-width action button. Keeps its size while showing a spinner. */
export function Button({ label, variant = 'primary', busy = false, disabled, ...props }: Props) {
  const theme = useTheme();
  const bg = { primary: theme.primary, danger: theme.danger, secondary: theme.backgroundElement }[variant];
  const fg = { primary: theme.onPrimary, danger: '#FFFFFF', secondary: theme.primary }[variant];
  const off = !!disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled && !busy ? 0.4 : pressed ? 0.85 : 1 },
      ]}
      {...props}>
      {busy ? <ActivityIndicator color={fg} /> : <ThemedText style={[styles.label, { color: fg }]}>{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 17, fontWeight: 600 },
});

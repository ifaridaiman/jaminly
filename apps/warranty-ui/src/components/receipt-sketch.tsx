import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Drawn receipt used as a placeholder thumbnail and in empty states. `width` sets the scale. */
export function ReceiptSketch({ width, accent = false }: { width: number; accent?: boolean }) {
  const theme = useTheme();
  const u = width / 10; // grid unit
  const strong = accent ? theme.primary : theme.border;
  const soft = accent ? theme.primary + '55' : theme.border;
  const line = (w: number, color: string) => (
    <View style={{ width: w * u, height: Math.max(1.5, u * 0.45), borderRadius: u, backgroundColor: color }} />
  );

  return (
    <View
      style={[
        styles.paper,
        { width, height: width * 1.3, padding: u * 1.5, gap: u * 0.9, borderRadius: u, backgroundColor: theme.background, borderColor: accent ? theme.primary : theme.border },
      ]}>
      {line(5, strong)}
      {line(6.5, soft)}
      {line(6, soft)}
      {line(3.5, soft)}
      <View style={{ flex: 1 }} />
      <View style={{ alignSelf: 'flex-end' }}>{line(2.5, strong)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderWidth: 1 },
});

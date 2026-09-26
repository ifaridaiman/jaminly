import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatDate, localDate, toYmd } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: string; onChange: (ymd: string) => void; accessibilityLabel: string; maximumDate?: Date };

/** iOS: inline compact picker. Android: pill that opens the system date dialog. Value is YYYY-MM-DD. */
export function DateField({ value, onChange, accessibilityLabel, maximumDate }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const date = localDate(value);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="date"
        display="compact"
        accentColor={theme.primary}
        maximumDate={maximumDate}
        onChange={(_, d) => d && onChange(toYmd(d))}
        style={styles.ios}
      />
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${formatDate(value)}`}
        onPress={() => setOpen(true)}
        style={[styles.pill, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText>{formatDate(value)}</ThemedText>
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={maximumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(toYmd(d));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  ios: { width: 130 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});

import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Option<T> = { value: T; label: string; icon?: SymbolViewProps['name'] };

type Props<T> = {
  visible: boolean;
  title: string;
  options: Option<T>[];
  selected?: T | T[];
  onSelect: (value: T) => void;
  onClose: () => void;
};

/**
 * Bottom sheet list of choices. Works the same on iOS, Android and web.
 * Pass an array as `selected` for multi-select: taps toggle and the sheet stays open until Done.
 */
export function OptionSheet<T extends string | number>({ visible, title, options, selected, onSelect, onClose }: Props<T>) {
  const multi = Array.isArray(selected);
  const isSelected = (v: T) => (multi ? selected.includes(v) : v === selected);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          {title}
        </ThemedText>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole={multi ? 'checkbox' : 'button'}
            accessibilityState={multi ? { checked: isSelected(o.value) } : { selected: isSelected(o.value) }}
            onPress={() => {
              if (!multi) onClose();
              onSelect(o.value);
            }}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundElement }]}>
            {o.icon && <SymbolView name={o.icon} size={20} tintColor={theme.primary} />}
            <ThemedText style={styles.label}>{o.label}</ThemedText>
            {isSelected(o.value) && (
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={18} tintColor={theme.primary} />
            )}
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={onClose} style={[styles.cancel, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={[styles.label, styles.cancelLabel, { color: theme.primary }]}>{multi ? 'Done' : 'Cancel'}</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 52, paddingHorizontal: Spacing.three, borderRadius: 12 },
  label: { flex: 1, fontSize: 17 },
  cancel: { minHeight: 52, justifyContent: 'center', borderRadius: 12, marginTop: Spacing.two },
  cancelLabel: { textAlign: 'center', fontWeight: 600 },
});

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & { label: string; error?: string; password?: boolean };

/** Label above, input, error below. `password` adds a Show/Hide toggle. */
export function FormField({ label, error, password, style, ...props }: Props) {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: error ? theme.danger : 'transparent' }]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={password && hidden}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          style={[styles.input, { color: theme.text }, style]}
          {...props}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              {hidden ? 'Show' : 'Hide'}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {!!error && (
        <ThemedText type="small" accessibilityLiveRegion="polite" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: Spacing.two, outlineStyle: 'none' } as object,
});

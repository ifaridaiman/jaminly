import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export const CODE_LENGTH = 6;

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & { value: string; onChangeText: (code: string) => void };

/** Big centred 6-digit box for emailed codes. Keeps digits only; phones offer to fill it from the email/SMS. */
export function CodeInput({ value, onChangeText, style, ...props }: Props) {
  const theme = useTheme();
  return (
    <TextInput
      accessibilityLabel="Code from the email"
      value={value}
      // No maxLength: on web it swallows keystrokes; slicing here caps it instead.
      onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
      placeholder={'•'.repeat(CODE_LENGTH)}
      placeholderTextColor={theme.textSecondary}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 12,
    outlineStyle: 'none',
  } as object,
});

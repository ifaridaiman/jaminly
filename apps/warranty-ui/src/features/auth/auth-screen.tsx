import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shared frame for sign-up, verify and reset: title, one line of explanation, then the form. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <ThemedText style={styles.title} accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
});

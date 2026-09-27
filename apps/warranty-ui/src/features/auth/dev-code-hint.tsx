import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { env } from '@/lib/env';

/** Dev builds against a local API: codes land in MailHog (warranty-api docker compose), not a real inbox. */
export function DevCodeHint() {
  const theme = useTheme();
  if (!__DEV__ || !/localhost|127\.0\.0\.1|192\.168\.|10\./.test(env.apiBaseUrl)) return null;
  return (
    <View style={[styles.pill, { backgroundColor: theme.warningBg }]}>
      <ThemedText type="small" style={{ color: theme.warning }}>
        Dev: the email is in MailHog at localhost:8025
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 8 },
});

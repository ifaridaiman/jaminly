import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';
import { env } from '@/lib/env';

// Google brand button colours: https://developers.google.com/identity/branding-guidelines
const GOOGLE = {
  light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3' },
};

export default function LoginScreen() {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const google = GOOGLE[scheme];
  const { signIn } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setError(null);
    setLoading(true);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <ThemedText type="subtitle" accessibilityRole="header">
            Jaminly
          </ThemedText>
          <ThemedText style={styles.tagline}>Never miss a warranty again.</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Keep your receipts in one place and get reminded before they expire.
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ busy: loading, disabled: loading }}
          disabled={loading}
          onPress={onPress}
          style={({ pressed }) => [
            styles.googleButton,
            { backgroundColor: google.bg, borderColor: google.border, opacity: pressed ? 0.8 : 1 },
          ]}>
          {loading ? (
            <ActivityIndicator color={google.text} />
          ) : (
            <>
              {/* ponytail: text "G" placeholder. Swap for the official Google "G" logo asset before store release. */}
              <ThemedText style={[styles.googleG, { color: google.text }]}>G</ThemedText>
              <ThemedText style={[styles.googleLabel, { color: google.text }]}>
                Continue with Google
              </ThemedText>
            </>
          )}
        </Pressable>

        {error && (
          <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: '#CF222E' }]}>
            {error}
          </ThemedText>
        )}
        {env.mockAuth && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Dev mode: mock sign-in
          </ThemedText>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Free & open source
      </ThemedText>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: Spacing.three },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: Spacing.two },
  tagline: { fontSize: 22, lineHeight: 28, fontWeight: 700, textAlign: 'center' },
  center: { textAlign: 'center' },
  googleButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  googleG: { fontSize: 18, fontWeight: 700 },
  googleLabel: { fontSize: 16, fontWeight: 500 },
});

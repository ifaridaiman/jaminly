import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { errorMessage } from '@/lib/api';
import { env } from '@/lib/env';

import { OrDivider } from './or-divider';

// Google brand button colours: https://developers.google.com/identity/branding-guidelines
const GOOGLE = {
  light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3' },
};

/**
 * "or" + "Continue with Google". Renders nothing until EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set.
 * Reports failures through `onError` so the screen shows them in one place.
 */
export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const google = GOOGLE[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [busy, setBusy] = useState(false);
  if (!env.googleWebClientId) return null;

  async function onPress() {
    onError(null);
    setBusy(true);
    try {
      // ponytail: SDK not wired yet. Next: @react-native-google-signin/google-signin → idToken →
      // startSession(await api.signInWithGoogle(idToken), 'google').
      throw new Error("Google sign-in isn't wired up yet. Use email and password.");
    } catch (e) {
      onError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <OrDivider />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: google.bg, borderColor: google.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        {busy ? (
          <ActivityIndicator color={google.text} />
        ) : (
          <>
            {/* ponytail: placeholder mark. Swap for the official Google "G" logo asset before store release. */}
            <View style={[styles.g, { borderColor: google.border }]}>
              <ThemedText style={[styles.gText, { color: google.text }]}>G</ThemedText>
            </View>
            <ThemedText style={[styles.label, { color: google.text }]}>Continue with Google</ThemedText>
          </>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  g: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  label: { fontSize: 17, fontWeight: 500 },
});

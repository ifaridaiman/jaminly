import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { PRIVACY_URL, REPO_URL } from '@/constants/links';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { StatusBadge } from '@/features/warranties/components/status-badge';
import type { WarrantyStatus } from '@/features/warranties/status';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { env } from '@/lib/env';

// Google brand button colours: https://developers.google.com/identity/branding-guidelines
const GOOGLE = {
  light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3' },
};

const PREVIEW: { name: string; icon: SymbolViewProps['name']; status: WarrantyStatus; label: string; tilt: string; indent: number }[] = [
  { name: 'Samsung QLED TV', icon: { ios: 'tv', android: 'tv', web: 'tv' }, status: 'expiring_soon', label: '12 days left', tilt: '-2deg', indent: 0 },
  { name: 'MacBook Air', icon: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' }, status: 'active', label: 'Active', tilt: '1.5deg', indent: Spacing.four },
];

export default function LoginScreen() {
  const theme = useTheme();
  const google = GOOGLE[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
        <View style={styles.brand}>
          <Image source={require('@/assets/logo/jaminly-mark.png')} style={styles.logo} accessibilityIgnoresInvertColors />
          <ThemedText style={styles.brandName} accessibilityRole="header">
            Jaminly
          </ThemedText>
        </View>

        <View style={styles.preview} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {PREVIEW.map((w) => (
            <View
              key={w.name}
              style={[
                styles.previewCard,
                { backgroundColor: theme.backgroundElement, marginLeft: w.indent, transform: [{ rotate: w.tilt }] },
              ]}>
              <View style={[styles.previewIcon, { backgroundColor: theme.background }]}>
                <SymbolView name={w.icon} size={20} tintColor={theme.text} />
              </View>
              <ThemedText style={styles.previewName} numberOfLines={1}>
                {w.name}
              </ThemedText>
              <View>
                <StatusBadge status={w.status} label={w.label} icon={false} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.copy}>
          <ThemedText style={styles.headline}>Never miss a warranty again.</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            Keep your receipts in one place and get reminded before they expire.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
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
              {/* ponytail: placeholder mark. Swap for the official Google "G" logo asset before store release. */}
              <View style={[styles.googleG, { borderColor: google.border }]}>
                <ThemedText style={[styles.googleGText, { color: google.text }]}>G</ThemedText>
              </View>
              <ThemedText style={[styles.googleLabel, { color: google.text }]}>Continue with Google</ThemedText>
            </>
          )}
        </Pressable>

        {error && (
          <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: theme.danger }]}>
            {error}
          </ThemedText>
        )}
        {env.mockAuth && (
          <View style={[styles.devPill, { backgroundColor: theme.warningBg }]}>
            <ThemedText type="small" style={{ color: theme.warning }}>
              Dev mode: mock sign-in
            </ThemedText>
          </View>
        )}

        <View style={styles.links}>
          <ThemedText type="small" themeColor="textSecondary">
            Free & open source ·{' '}
          </ThemedText>
          <ExternalLink href={PRIVACY_URL}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              Privacy
            </ThemedText>
          </ExternalLink>
          <ThemedText type="small" themeColor="textSecondary">
            {' · '}
          </ThemedText>
          <ExternalLink href={REPO_URL}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              GitHub
            </ThemedText>
          </ExternalLink>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  content: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: Spacing.five, gap: Spacing.five },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  preview: { gap: Spacing.two, paddingVertical: Spacing.two },
  previewCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one, padding: Spacing.two + Spacing.one, borderRadius: 16 },
  previewIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewName: { flex: 1, fontSize: 15, fontWeight: 600 },
  copy: { gap: Spacing.three },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: 700 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
  footer: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.three, alignItems: 'center' },
  center: { textAlign: 'center' },
  googleButton: {
    alignSelf: 'stretch',
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  googleG: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  googleGText: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  googleLabel: { fontSize: 17, fontWeight: 500 },
  devPill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
});

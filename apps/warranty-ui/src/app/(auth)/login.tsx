import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PRIVACY_URL, REPO_URL } from '@/constants/links';
import { Spacing } from '@/constants/theme';
import { GoogleButton } from '@/features/auth/google-button';
import { useSession } from '@/features/auth/session-provider';
import { emailError } from '@/features/auth/validate';
import { StatusBadge } from '@/features/warranties/components/status-badge';
import type { WarrantyStatus } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, errorMessage } from '@/lib/api';

const PREVIEW: {
  name: string;
  icon: SymbolViewProps['name'];
  status: WarrantyStatus;
  label: string;
  tilt: string;
  indent: number;
}[] = [
  {
    name: 'Samsung QLED TV',
    icon: { ios: 'tv', android: 'tv', web: 'tv' },
    status: 'expiring_soon',
    label: '12 days left',
    tilt: '-2deg',
    indent: 0,
  },
  {
    name: 'MacBook Air',
    icon: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' },
    status: 'active',
    label: 'Active',
    tilt: '1.5deg',
    indent: Spacing.four,
  },
];

export default function LoginScreen() {
  const theme = useTheme();
  const { startSession, setPendingEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    const found = { email: emailError(email), password: password ? undefined : 'Enter your password.' };
    setErrors(found);
    setError(null);
    if (found.email || found.password) return;

    setBusy(true);
    try {
      startSession(await api.login(email.trim(), password), 'email');
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(email.trim().toLowerCase());
        router.push('/verify-email');
        return;
      }
      setError(errorMessage(e));
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image
              source={require('@/assets/logo/jaminly-mark.png')}
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
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

        <View style={styles.form}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <FormField
            label="Password"
            password
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={signIn}
          />
          <Link href="/forgot-password" style={[styles.forgot, { color: theme.primary }]}>
            Forgot password?
          </Link>

          {error && (
            <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: theme.danger }]}>
              {error}
            </ThemedText>
          )}
          <Button label="Sign in" busy={busy} onPress={signIn} />
          <GoogleButton onError={setError} />

          <View style={styles.signUp}>
            <ThemedText themeColor="textSecondary">New to Jaminly? </ThemedText>
            <Link href="/register" style={[styles.linkText, { color: theme.primary }]}>
              Create account
            </Link>
          </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.five },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: Spacing.four, gap: Spacing.four },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two + Spacing.one },
  logo: { width: 32, height: 32 },
  brandName: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  preview: { gap: Spacing.two, paddingVertical: Spacing.two },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    padding: Spacing.two + Spacing.one,
    borderRadius: 16,
  },
  previewIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewName: { flex: 1, fontSize: 15, fontWeight: 600 },
  copy: { gap: Spacing.two },
  headline: { fontSize: 34, lineHeight: 40, fontWeight: 700 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: Spacing.three },
  forgot: { alignSelf: 'flex-end', fontSize: 15, marginTop: -Spacing.one },
  center: { textAlign: 'center' },
  signUp: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  linkText: { fontSize: 16, fontWeight: 600 },
  devPill: { alignSelf: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
});

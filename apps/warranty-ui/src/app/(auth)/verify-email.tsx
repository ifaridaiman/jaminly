import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/code-input';
import { AuthScreen } from '@/features/auth/auth-screen';
import { DevCodeHint } from '@/features/auth/dev-code-hint';
import { useSession } from '@/features/auth/session-provider';
import { useCountdown } from '@/hooks/use-countdown';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';

export default function VerifyEmailScreen() {
  const theme = useTheme();
  const { user, pendingEmail, startSession } = useSession();
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(() => Date.now() + 30_000); // a code was just sent
  const resendIn = useCountdown(resendAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Reached by reload or a pasted URL: nothing to verify. (Right after verifying, `user` is set and
  // the auth guard is already moving to the app, so don't fight it.)
  if (!pendingEmail) return user ? null : <Redirect href="/login" />;
  const email = pendingEmail;

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      startSession(await api.verifyEmail(email, code), 'email');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const sent = await api.resendVerification(email);
      setResendAt(Date.now() + sent.resendAfterSeconds * 1000);
      setCode('');
      setNotice('We sent a new code.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <AuthScreen
      title="Check your email"
      subtitle={
        <>
          We sent a {CODE_LENGTH}-digit code to <ThemedText style={styles.email}>{email}</ThemedText>. Enter it to
          finish creating your account.
        </>
      }>
      <CodeInput value={code} onChangeText={setCode} autoFocus onSubmitEditing={() => code.length === CODE_LENGTH && verify()} />
      <DevCodeHint />
      {error && (
        <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: theme.danger }]}>
          {error}
        </ThemedText>
      )}
      {notice && !error && (
        <ThemedText accessibilityLiveRegion="polite" themeColor="textSecondary" style={styles.center}>
          {notice}
        </ThemedText>
      )}
      <Button label="Verify and continue" busy={busy} disabled={code.length !== CODE_LENGTH} onPress={verify} />
      <Pressable accessibilityRole="button" disabled={resendIn > 0} onPress={resend} style={styles.resend}>
        <ThemedText style={{ color: resendIn > 0 ? theme.textSecondary : theme.primary }}>
          {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
        </ThemedText>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  email: { fontWeight: 600 },
  center: { textAlign: 'center' },
  resend: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});

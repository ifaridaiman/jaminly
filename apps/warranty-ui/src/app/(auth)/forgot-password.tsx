import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/code-input';
import { FormField } from '@/components/ui/form-field';
import { AuthScreen } from '@/features/auth/auth-screen';
import { DevCodeHint } from '@/features/auth/dev-code-hint';
import { useSession } from '@/features/auth/session-provider';
import { emailError, newPasswordError } from '@/features/auth/validate';
import { useCountdown } from '@/hooks/use-countdown';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, errorMessage } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { startSession } = useSession();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const resendIn = useCountdown(resendAt);

  async function sendCode() {
    const e = emailError(email);
    setFieldErrors({ email: e });
    setError(null);
    if (e) return;
    setBusy(true);
    try {
      const sent = await api.forgotPassword(email.trim());
      setResendAt(Date.now() + sent.resendAfterSeconds * 1000);
      setCode('');
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const p = newPasswordError(password);
    setFieldErrors({ password: p });
    setError(null);
    if (p) return;
    setBusy(true);
    try {
      startSession(await api.resetPassword(email.trim(), code, password), 'email');
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.fields.password) setFieldErrors({ password: err.fields.password });
      else setError(errorMessage(err));
    }
  }

  const errorText = error && (
    <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: theme.danger }]}>
      {error}
    </ThemedText>
  );

  if (step === 'email')
    return (
      <AuthScreen title="Reset your password" subtitle="Enter your account's email and we'll send you a code.">
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={sendCode}
        />
        {errorText}
        <Button label="Email me a code" busy={busy} onPress={sendCode} />
      </AuthScreen>
    );

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle={
        <>
          If <ThemedText style={styles.email}>{email.trim()}</ThemedText> has an account, we sent it a {CODE_LENGTH}-digit
          code. Other devices will be signed out.
        </>
      }>
      <CodeInput value={code} onChangeText={setCode} autoFocus />
      <DevCodeHint />
      <FormField
        label="New password"
        password
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => code.length === CODE_LENGTH && reset()}
      />
      {errorText}
      <Button label="Save and sign in" busy={busy} disabled={code.length !== CODE_LENGTH} onPress={reset} />
      <Pressable accessibilityRole="button" disabled={resendIn > 0 || busy} onPress={sendCode} style={styles.resend}>
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

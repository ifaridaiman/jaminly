import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { AuthScreen } from '@/features/auth/auth-screen';
import { GoogleButton } from '@/features/auth/google-button';
import { useSession } from '@/features/auth/session-provider';
import { emailError, newPasswordError } from '@/features/auth/validate';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, errorMessage } from '@/lib/api';

type Errors = { name?: string; email?: string; password?: string };

export default function RegisterScreen() {
  const theme = useTheme();
  const { setPendingEmail } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found: Errors = {
      name: name.trim() ? undefined : 'Enter your name.',
      email: emailError(email),
      password: newPasswordError(password),
    };
    setErrors(found);
    setError(null);
    if (found.name || found.email || found.password) return;

    setBusy(true);
    try {
      const sent = await api.register({ name: name.trim(), email: email.trim(), password });
      setPendingEmail(sent.email);
      router.replace('/verify-email');
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && Object.keys(e.fields).length) setErrors(e.fields);
      else setError(errorMessage(e));
    }
  }

  return (
    <AuthScreen title="Create your account" subtitle="We'll email you a code to confirm it's you.">
      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
      />
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
        placeholder="At least 8 characters"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {error && (
        <ThemedText accessibilityLiveRegion="polite" style={[styles.center, { color: theme.danger }]}>
          {error}
        </ThemedText>
      )}
      <Button label="Create account" busy={busy} onPress={submit} />
      <GoogleButton onError={setError} />
      <View style={styles.row}>
        <ThemedText themeColor="textSecondary">Already have an account? </ThemedText>
        <Link href="/login" style={[styles.link, { color: theme.primary }]}>
          Sign in
        </Link>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  link: { fontSize: 16, fontWeight: 600 },
});

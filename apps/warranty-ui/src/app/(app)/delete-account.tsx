import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/code-input';
import { Spacing } from '@/constants/theme';
import { DevCodeHint } from '@/features/auth/dev-code-hint';
import { useSession } from '@/features/auth/session-provider';
import { useCountdown } from '@/hooks/use-countdown';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';

const CONFIRM_WORD = 'delete';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [step, setStep] = useState<'confirm' | 'code'>('confirm');
  const [word, setWord] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const resendIn = useCountdown(resendAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestAccountDeletion();
      setEmail(res.email);
      setResendAt(Date.now() + res.resendAfterSeconds * 1000);
      setCode('');
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeletion() {
    setBusy(true);
    setError(null);
    try {
      await api.confirmAccountDeletion(code);
      queryClient.clear();
      signOut(); // the auth guard takes the user back to login
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const canSend = word.trim().toLowerCase() === CONFIRM_WORD && !busy;
  const canDelete = code.length === CODE_LENGTH && !busy;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ModalHeader
        title="Delete account"
        left={
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()} disabled={busy}>
            <ThemedText style={{ color: theme.primary, fontSize: 17 }}>Cancel</ThemedText>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'confirm' ? (
          <>
            <ThemedText style={styles.heading}>This can&apos;t be undone</ThemedText>
            <ThemedText themeColor="textSecondary">
              Deleting your account permanently removes all your warranties, receipts and reminders. We&apos;ll email you a
              code to confirm it&apos;s you.
            </ThemedText>
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Type <ThemedText type="smallBold">{CONFIRM_WORD}</ThemedText> to continue
              </ThemedText>
              <TextInput
                accessibilityLabel={`Type ${CONFIRM_WORD} to continue`}
                value={word}
                onChangeText={setWord}
                placeholder={CONFIRM_WORD}
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={() => canSend && sendCode()}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </View>
            <View style={styles.action}>
              <Button variant="danger" label="Email me a code" onPress={sendCode} disabled={!canSend} busy={busy} />
            </View>
          </>
        ) : (
          <>
            <ThemedText style={styles.heading}>Check your email</ThemedText>
            <ThemedText themeColor="textSecondary">
              We sent a {CODE_LENGTH}-digit code to <ThemedText style={styles.email}>{email}</ThemedText>. Enter it below to
              delete your account.
            </ThemedText>
            <CodeInput
              value={code}
              onChangeText={setCode}
              autoFocus
              onSubmitEditing={() => canDelete && confirmDeletion()}
              style={styles.action}
            />
            <DevCodeHint />
            <View style={styles.action}>
              <Button variant="danger" label="Delete my account" onPress={confirmDeletion} disabled={!canDelete} busy={busy} />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={resendIn > 0 || busy}
              onPress={sendCode}
              style={styles.resend}>
              <ThemedText style={{ color: resendIn > 0 ? theme.textSecondary : theme.primary }}>
                {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
              </ThemedText>
            </Pressable>
          </>
        )}
        {error && (
          <ThemedText accessibilityLiveRegion="polite" style={{ color: theme.danger, textAlign: 'center' }}>
            {error}
          </ThemedText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: 480, alignSelf: 'center' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  email: { fontWeight: 600 },
  field: { gap: Spacing.one, marginTop: Spacing.two },
  input: { minHeight: 50, borderRadius: 12, paddingHorizontal: Spacing.three, fontSize: 17, outlineStyle: 'none' } as object,
  action: { marginTop: Spacing.two },
  resend: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});

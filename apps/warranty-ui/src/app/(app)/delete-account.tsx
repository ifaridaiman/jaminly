import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';
import { api, MOCK_DELETION_CODE } from '@/lib/api';
import { env } from '@/lib/env';

const CONFIRM_WORD = 'delete';
const CODE_LENGTH = 6;

const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [step, setStep] = useState<'confirm' | 'code'>('confirm');
  const [word, setWord] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick once a second while the resend button is cooling down.
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [resendAt]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestAccountDeletion();
      setEmail(res.email);
      setResendAt(Date.now() + res.resendAfterSeconds * 1000);
      setNow(Date.now());
      setCode('');
      setStep('code');
    } catch (e) {
      setError(message(e));
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
      setError(message(e));
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
            <DangerButton label="Email me a code" onPress={sendCode} disabled={!canSend} busy={busy} />
          </>
        ) : (
          <>
            <ThemedText style={styles.heading}>Check your email</ThemedText>
            <ThemedText themeColor="textSecondary">
              We sent a {CODE_LENGTH}-digit code to <ThemedText style={styles.email}>{email}</ThemedText>. Enter it below to
              delete your account.
            </ThemedText>
            <TextInput
              accessibilityLabel="Confirmation code"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              placeholder={'•'.repeat(CODE_LENGTH)}
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              autoFocus
              onSubmitEditing={() => canDelete && confirmDeletion()}
              style={[styles.input, styles.codeInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {env.useMockApi && (
              <View style={[styles.devPill, { backgroundColor: theme.warningBg }]}>
                <ThemedText type="small" style={{ color: theme.warning }}>
                  Dev mode: the mock code is {MOCK_DELETION_CODE}
                </ThemedText>
              </View>
            )}
            <DangerButton label="Delete my account" onPress={confirmDeletion} disabled={!canDelete} busy={busy} />
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

function DangerButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled: boolean; busy: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.danger, opacity: disabled && !busy ? 0.4 : pressed ? 0.85 : 1 },
      ]}>
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <ThemedText style={styles.buttonLabel}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: 480, alignSelf: 'center' },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  email: { fontWeight: 600 },
  field: { gap: Spacing.one, marginTop: Spacing.two },
  input: { minHeight: 50, borderRadius: 12, paddingHorizontal: Spacing.three, fontSize: 17, outlineStyle: 'none' } as object,
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 12, marginTop: Spacing.two },
  devPill: { alignSelf: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 8 },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  buttonLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: 600 },
  resend: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});

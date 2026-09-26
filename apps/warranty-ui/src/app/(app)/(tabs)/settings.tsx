import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { openBrowserAsync } from 'expo-web-browser';
import { Fragment, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionSheet } from '@/components/option-sheet';
import { ThemedText } from '@/components/themed-text';
import { PRIVACY_URL, REPO_URL } from '@/constants/links';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useSettings, type AppearancePref } from '@/features/settings/settings-provider';
import { formatReminders } from '@/features/warranties/status';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const REMINDER_OPTIONS = [60, 30, 14, 7, 0].map((d) => ({ value: d, label: d === 0 ? 'On expiry day' : `${d} days before` }));
const APPEARANCES: { value: AppearancePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useSession();
  const settings = useSettings();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const segmentBg = useColorScheme() === 'dark' ? theme.backgroundSelected : theme.background;

  const toggleDefaultReminder = (d: number) =>
    settings.update({
      defaultReminders: settings.defaultReminders.includes(d)
        ? settings.defaultReminders.filter((x) => x !== d)
        : [...settings.defaultReminders, d],
    });

  const switchColors = { trackColor: { false: theme.backgroundSelected, true: theme.primary }, thumbColor: '#FFFFFF' };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + 120 }]}>
      <ThemedText style={styles.title} accessibilityRole="header">
        Settings
      </ThemedText>

      <View style={[styles.profile, { backgroundColor: theme.backgroundElement }]}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.initials, { color: theme.onPrimary }]}>{initials(user?.name)}</ThemedText>
          </View>
        )}
        <View style={styles.profileText}>
          <ThemedText style={styles.name}>{user?.name}</ThemedText>
          <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Signed in with Google
          </ThemedText>
        </View>
      </View>

      <Section title="Notifications">
        {/* Web has no push; it gets email and the in-app "Expiring soon" list. */}
        {Platform.OS !== 'web' && (
          <Row label="Push notifications">
            <Switch
              accessibilityLabel="Push notifications"
              value={settings.push}
              onValueChange={(push) => settings.update({ push })}
              {...switchColors}
            />
          </Row>
        )}
        <Row label="Email reminders">
          <Switch
            accessibilityLabel="Email reminders"
            value={settings.email}
            onValueChange={(email) => settings.update({ email })}
            {...switchColors}
          />
        </Row>
        <Row label="Default reminders" onPress={() => setRemindersOpen(true)}>
          <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.value}>
            {formatReminders(settings.defaultReminders)}
          </ThemedText>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={theme.textSecondary} />
        </Row>
      </Section>

      <Section title="Appearance">
        <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup">
          {APPEARANCES.map(({ value, label }) => {
            const selected = settings.appearance === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => settings.update({ appearance: value })}
                style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: segmentBg }]]}>
                <ThemedText style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>{label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="About">
        <Row label="Version">
          <ThemedText themeColor="textSecondary">{Constants.expoConfig?.version ?? '—'}</ThemedText>
        </Row>
        <Row label="Source code on GitHub" onPress={() => openBrowserAsync(REPO_URL)} external />
        <Row label="License">
          <ThemedText themeColor="textSecondary">MIT</ThemedText>
        </Row>
        <Row label="Privacy policy" onPress={() => openBrowserAsync(PRIVACY_URL)} external />
      </Section>

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={({ pressed }) => [styles.signOut, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
        <ThemedText style={[styles.signOutLabel, { color: theme.primary }]}>Sign out</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/delete-account')} style={styles.deleteAccount}>
        <ThemedText style={{ color: theme.danger, fontSize: 17 }}>Delete account</ThemedText>
      </Pressable>

      <OptionSheet
        visible={remindersOpen}
        title="Default reminders for new warranties"
        options={REMINDER_OPTIONS}
        selected={settings.defaultReminders}
        onSelect={toggleDefaultReminder}
        onClose={() => setRemindersOpen(false)}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  const isGroup = title !== 'Appearance';
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </ThemedText>
      {isGroup ? (
        <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
          {rows.map((row, i) => (
            <Fragment key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              {row}
            </Fragment>
          ))}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function Row({ label, children, onPress, external }: { label: string; children?: ReactNode; onPress?: () => void; external?: boolean }) {
  const theme = useTheme();
  const content = (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.rowValue}>
        {children}
        {external && (
          <SymbolView name={{ ios: 'arrow.up.right', android: 'north_east', web: 'north_east' }} size={14} tintColor={theme.textSecondary} />
        )}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.three, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  title: { fontSize: 34, lineHeight: 41, fontWeight: 700 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 20, fontWeight: 700 },
  profileText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: 600 },
  section: { gap: Spacing.two },
  sectionTitle: { letterSpacing: 0.5 },
  group: { borderRadius: 16, paddingHorizontal: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, minHeight: 52 },
  rowLabel: { flexShrink: 0, fontSize: 17, fontWeight: 400 },
  rowValue: { flexShrink: 1, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  value: { flexShrink: 1 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 12 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentSelected: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)' },
  segmentLabel: { fontSize: 15, fontWeight: 400 },
  segmentLabelSelected: { fontWeight: 600 },
  signOut: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  signOutLabel: { fontSize: 17, fontWeight: 500 },
  deleteAccount: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.three },
});

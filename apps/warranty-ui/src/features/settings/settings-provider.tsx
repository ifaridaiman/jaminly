import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

import { useSession } from '@/features/auth/session-provider';
import { api, type NotificationSettings } from '@/lib/api';

export type AppearancePref = 'system' | 'light' | 'dark';

export type Settings = Omit<NotificationSettings, 'timezone'> & { appearance: AppearancePref };

type SettingsContextValue = Settings & { update: (patch: Partial<Settings>) => void };

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULTS: Settings = { push: true, email: false, defaultReminders: [30, 7, 0], appearance: 'system' };

/** Reminders fire at 09:00 here. Read each time so a device that travels keeps it current. */
const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Notification settings live on the server; appearance stays on this device (in memory). */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [settings, setSettings] = useState(DEFAULTS);
  const userId = user?.id;

  // Load on sign-in. If the server has another timezone (new device, travel), send this one.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api
      .getNotificationSettings()
      .then(async (s) => {
        if (cancelled) return;
        setSettings((prev) => ({ ...prev, push: s.push, email: s.email, defaultReminders: s.defaultReminders }));
        if (s.timezone !== deviceTimeZone()) await api.saveNotificationSettings({ ...s, timezone: deviceTimeZone() });
      })
      .catch(() => undefined); // offline: keep what we have; the next sign-in retries
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    // Native UI (status bar, pickers, tab bar) follows the OS scheme, so override it there too.
    // react-native-web can't, which is why useColorScheme also reads `appearance` directly.
    if (patch.appearance && Platform.OS !== 'web') {
      Appearance.setColorScheme(patch.appearance === 'system' ? 'unspecified' : patch.appearance);
    }
    if (userId && ('push' in patch || 'email' in patch || 'defaultReminders' in patch)) {
      const { push, email, defaultReminders } = next;
      api
        .saveNotificationSettings({ push, email, defaultReminders, timezone: deviceTimeZone() })
        .catch(() => setSettings(settings)); // put the switch back so the screen never lies
    }
  }

  return <SettingsContext value={{ ...settings, update }}>{children}</SettingsContext>;
}

export function useSettings() {
  const settings = use(SettingsContext);
  if (!settings) throw new Error('useSettings must be used inside <SettingsProvider>');
  return settings;
}

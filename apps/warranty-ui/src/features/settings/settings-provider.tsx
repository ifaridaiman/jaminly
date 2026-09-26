import { createContext, use, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

export type AppearancePref = 'system' | 'light' | 'dark';

export type Settings = {
  push: boolean;
  email: boolean;
  defaultReminders: number[];
  appearance: AppearancePref;
};

type SettingsContextValue = Settings & { update: (patch: Partial<Settings>) => void };

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULTS: Settings = { push: true, email: false, defaultReminders: [30, 7, 0], appearance: 'system' };

export function SettingsProvider({ children }: { children: ReactNode }) {
  // ponytail: in-memory, lost on reload. Save via PUT /me/notification-settings (and appearance locally) at M2.
  const [settings, setSettings] = useState(DEFAULTS);

  function update(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
    // Native UI (status bar, pickers, tab bar) follows the OS scheme, so override it there too.
    // react-native-web can't, which is why useColorScheme also reads `appearance` directly.
    if (patch.appearance && Platform.OS !== 'web') {
      Appearance.setColorScheme(patch.appearance === 'system' ? 'unspecified' : patch.appearance);
    }
  }

  return <SettingsContext value={{ ...settings, update }}>{children}</SettingsContext>;
}

export function useSettings() {
  const settings = use(SettingsContext);
  if (!settings) throw new Error('useSettings must be used inside <SettingsProvider>');
  return settings;
}

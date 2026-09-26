import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useSettings } from '@/features/settings/settings-provider';

const noopSubscribe = () => () => {};

/**
 * The system scheme, unless the user picked Light or Dark in Settings.
 * Static rendering has no system scheme, so the server (and first client render) use light.
 */
export function useColorScheme() {
  const { appearance } = useSettings();
  const system = useSystemColorScheme();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (appearance !== 'system') return appearance;
  return hydrated ? system : 'light';
}

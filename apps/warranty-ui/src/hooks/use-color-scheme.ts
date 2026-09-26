import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useSettings } from '@/features/settings/settings-provider';

/** The system scheme, unless the user picked Light or Dark in Settings. */
export function useColorScheme() {
  const { appearance } = useSettings();
  const system = useSystemColorScheme();
  return appearance === 'system' ? system : appearance;
}

import { createElement } from 'react';

import { Fonts } from '@/constants/theme';
import { toYmd } from '@/features/warranties/status';
import { useTheme } from '@/hooks/use-theme';

type Props = { value: string; onChange: (ymd: string) => void; accessibilityLabel: string; maximumDate?: Date };

/** Web: the browser's native date input, styled as a pill. */
export function DateField({ value, onChange, accessibilityLabel, maximumDate }: Props) {
  const theme = useTheme();
  return createElement('input', {
    type: 'date',
    value,
    max: maximumDate ? toYmd(maximumDate) : undefined,
    'aria-label': accessibilityLabel,
    onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    style: {
      fontFamily: Fonts.sans,
      fontSize: 17,
      color: theme.text,
      backgroundColor: theme.backgroundSelected,
      border: 'none',
      borderRadius: 8,
      padding: '6px 12px',
      colorScheme: 'light dark',
    },
  });
}

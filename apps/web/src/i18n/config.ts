// Locales must match `i18n.locales` in astro.config.mjs (PRD §5.6).
export const locales = ['en', 'ms'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeMeta: Record<
  Locale,
  { name: string; short: string; hreflang: string; ogLocale: string; dateLocale: string }
> = {
  en: { name: 'English', short: 'EN', hreflang: 'en', ogLocale: 'en_MY', dateLocale: 'en-MY' },
  ms: { name: 'Bahasa Melayu', short: 'BM', hreflang: 'ms', ogLocale: 'ms_MY', dateLocale: 'ms-MY' },
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

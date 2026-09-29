import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLocale, isLocale, locales, type Locale } from './config';
import en from './en';
import ms from './ms';
import type { Dictionary } from './types';

const dictionaries: Record<Locale, Dictionary> = { en, ms };

export function getLocale(currentLocale: string | undefined): Locale {
  return isLocale(currentLocale) ? currentLocale : defaultLocale;
}

export function t(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * The locale-neutral path of a URL: `/ms/privacy` → `/privacy`, `/ms` → `/`.
 * Used to link the same page in another language.
 */
export function neutralPath(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  const path = isLocale(first) && first !== defaultLocale ? `/${rest.join('/')}` : pathname;
  return path.replace(/\/+$/, '') || '/';
}

/** Relative URL of `path` (locale-neutral, e.g. `/privacy`) in `locale`. */
export function localizedPath(locale: Locale, path = '/'): string {
  return getRelativeLocaleUrl(locale, stripSlash(path));
}

/** Absolute URL of `path` in every locale, for `hreflang` alternates. */
export function alternates(path: string) {
  return locales.map((locale) => ({
    locale,
    href: withRootSlash(getAbsoluteLocaleUrl(locale, stripSlash(path))),
  }));
}

/** `https://jaminly.app` → `https://jaminly.app/`, matching the sitemap. Other paths are unchanged. */
function withRootSlash(href: string) {
  const url = new URL(href);
  return url.pathname === '/' ? url.origin + '/' : href;
}

function stripSlash(path: string) {
  return path.replace(/^\/+/, '');
}

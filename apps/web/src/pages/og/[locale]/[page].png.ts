// Build-time sharing images: /og/{locale}/{page}.png for Home and every legal page.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getEntry } from 'astro:content';
import { locales, type Locale } from '../../../i18n/config';
import { t } from '../../../i18n/utils';
import { legalPages } from '../../../lib/legal';
import { renderOgImage } from '../../../lib/og';

export const getStaticPaths = (() =>
  locales.flatMap((locale) =>
    ['home', ...legalPages].map((page) => ({ params: { locale, page } })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const strings = t(locale);
  let title = strings.home.headline;
  let subtitle = strings.home.lead;

  if (params.page !== 'home') {
    const entry = await getEntry('legal', `${locale}/${params.page}`);
    if (!entry) return new Response(null, { status: 404 });
    title = entry.data.title;
    subtitle = entry.data.summary[0];
  }

  const png = await renderOgImage({ title, subtitle });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://jaminly.app',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ms'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    // Phosphor only (DESIGN §3.4); the logo is the one custom SVG allowed.
    icon({ iconDir: 'src/assets/logo' }),
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ms: 'ms' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

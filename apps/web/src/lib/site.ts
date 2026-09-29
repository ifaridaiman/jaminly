export const REPO_URL = 'https://github.com/ifaridaiman/jaminly';
// The repo has no root LICENSE file yet (App PRD §11); point at the README's License section until it does.
export const LICENSE_URL = `${REPO_URL}#license`;
export const CONTACT_EMAIL = 'app@jaminly.app';

/**
 * Section anchors on the home page. The sections themselves land in W3
 * (PRD §12); `get-app` is the closing CTA until store listings exist.
 */
export const anchors = {
  features: 'features',
  privacy: 'privacy',
  faq: 'faq',
  getApp: 'get-app',
} as const;

/**
 * Store and web-app links. All null until launch; the closing section then shows
 * these instead of the "follow on GitHub" note (PRD §5.1).
 */
export const appLinks: { appStore: string | null; googlePlay: string | null; webApp: string | null } = {
  appStore: null,
  googlePlay: null,
  webApp: null,
};

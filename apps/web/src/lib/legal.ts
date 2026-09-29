// Every legal page exists in every language: src/content/legal/{en,ms}/<page>.md.
export const legalPages = ['privacy', 'terms', 'delete-account'] as const;
export type LegalPage = (typeof legalPages)[number];

export function legalStaticPaths() {
  return legalPages.map((page) => ({ params: { legal: page }, props: { page } }));
}

// Pre-launch checks on the built site (DESIGN §10, PRD §6). Run after `pnpm build`:
//
//   pnpm --filter jaminly-web preflight
//
// "Errors" are bugs. "Launch blockers" are known to-dos (photos, providers) that
// must be cleared before the site goes live. Either makes the command fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (!fs.existsSync(dist)) {
  console.error('No dist/ folder. Run `pnpm build` first.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.html')) files.push(full);
  }
})(dist);

const route = (file) => '/' + path.relative(dist, file).replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
const pages = new Map(files.map((file) => [route(file) || '/', fs.readFileSync(file, 'utf8')]));
const idsOf = (html) => new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ');

const errors = [];
const blockers = [];
const notes = [];

for (const [page, html] of pages) {
  const isNotFound = page === '/404';

  // Copy rules (DESIGN §8).
  if (/[–—]/.test(visibleText(html))) errors.push(`${page}: contains an em or en dash`);

  // One <h1> per page (SEO-6).
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1s !== 1) errors.push(`${page}: ${h1s} <h1> elements (expected 1)`);

  // Metadata (SEO-1..3, I18N-7).
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  if (!title) errors.push(`${page}: missing <title>`);
  else if (title.length > 60) errors.push(`${page}: title is ${title.length} characters (max 60)`);
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!description) errors.push(`${page}: missing meta description`);
  else if (description.length > 160) errors.push(`${page}: description is ${description.length} characters (max 160)`);
  if (!isNotFound) {
    if (!html.includes('rel="canonical"')) errors.push(`${page}: missing canonical link`);
    if (!html.includes('hreflang="x-default"')) errors.push(`${page}: missing hreflang x-default`);
  }
  const ogImage = html.match(/<meta property="og:image" content="https:\/\/jaminly\.app([^"]+)"/)?.[1];
  if (!ogImage) errors.push(`${page}: missing og:image`);
  else if (!fs.existsSync(path.join(dist, ogImage))) errors.push(`${page}: og:image ${ogImage} was not built`);

  // Internal links and #anchors resolve.
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(href) || href.startsWith('/_astro/') || /\.(svg|png|xml|ico)$/.test(href)) continue;
    const [target, hash] = href.split('#');
    const targetPage = (target || page).replace(/\/$/, '') || '/';
    if (!pages.has(targetPage)) errors.push(`${page}: link to missing page ${href}`);
    else if (hash && !idsOf(pages.get(targetPage)).has(hash)) errors.push(`${page}: link to missing anchor ${href}`);
  }

  // Launch blockers.
  for (const [, slot] of html.matchAll(/data-photo-placeholder="([^"]+)"/g)) {
    blockers.push(`${page}: photo placeholder "${slot}" (add src/assets/photos/${slot}.jpg)`);
  }
  if (/to be confirmed|akan disahkan/i.test(visibleText(html))) {
    blockers.push(`${page}: "to be confirmed" text left in (name the email and hosting providers)`);
  }
}

// Home: at most one eyebrow per three sections (taste §4.7).
for (const home of ['/', '/ms']) {
  const html = pages.get(home) ?? '';
  const eyebrows = (html.match(/class="eyebrow/g) ?? []).length;
  const sections = (html.match(/<section[\s>]/g) ?? []).length;
  if (eyebrows > Math.ceil(sections / 3)) errors.push(`${home}: ${eyebrows} eyebrows for ${sections} sections`);
}
if (!fs.existsSync(path.join(dist, '../src/assets/photos/og.jpg'))) {
  notes.push('og.jpg: sharing images use the app screenshot until src/assets/photos/og.jpg is added (optional)');
}

console.log(`Checked ${pages.size} pages.\n`);
const print = (label, list) => {
  const unique = [...new Set(list)];
  console.log(`${label}: ${unique.length}`);
  for (const item of unique) console.log(`  - ${item}`);
  console.log();
};
print('Errors', errors);
print('Launch blockers', blockers);
if (notes.length) print('Notes', notes);
console.log('Manual checks still needed: legal review, native-speaker review of Malay, both colour modes by eye (DESIGN §10).');
process.exit(errors.length || blockers.length ? 1 : 0);

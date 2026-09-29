// Re-captures the app screenshots used on the website (DESIGN §6).
//
//   pnpm --filter jaminly-web screens
//
// 1. Exports warranty-ui for the web (mock data + mock sign-in, the defaults).
// 2. Renders a fictional sample receipt (sample-receipt.html) to attach in the add flow.
// 3. Walks the app in light and dark mode and saves screenshots + crops into
//    src/assets/screens/{light,dark}/.
//
// Needs a Playwright Chromium browser (`pnpm --filter jaminly-web exec playwright install chromium`
// if you don't have one).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../..');
const appRoot = path.resolve(webRoot, '../warranty-ui');
const out = path.join(webRoot, 'src/assets/screens');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jaminly-screens-'));
const port = 8090;

console.log('Exporting warranty-ui for web…');
execSync(`npx expo export --platform web --output-dir ${path.join(tmp, 'app')}`, {
  cwd: appRoot,
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
});

// Static server with the Expo Router fallbacks (/foo → /foo.html → /index.html).
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    for (const candidate of [url, `${url}.html`, path.join(url, 'index.html'), '/index.html']) {
      const file = path.join(tmp, 'app', candidate);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    res.writeHead(404).end();
  })
  .listen(port);

const browser = await chromium.launch();

// Sample receipt: a made-up store, marked SAMPLE.
const receipt = path.join(tmp, 'sample-receipt.jpg');
{
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(`file://${path.join(here, 'sample-receipt.html')}`);
  await page.screenshot({ path: receipt, type: 'jpeg', quality: 88 });
  await page.close();
}

const wait = (page, ms = 900) => page.waitForTimeout(ms);
async function signIn(page) {
  await page.goto(`http://localhost:${port}/`);
  await wait(page, 1500);
  await page.getByText('Continue with Google').click();
  await wait(page, 2000);
}

for (const scheme of ['light', 'dark']) {
  const dir = path.join(out, scheme);
  fs.mkdirSync(dir, { recursive: true });
  const shot = (page, name) => page.screenshot({ path: path.join(dir, `${name}.png`) });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  page.on('dialog', (dialog) => dialog.accept());
  await signIn(page);
  await shot(page, 'home');

  await page.getByText('Samsung 55" QLED TV').click();
  await wait(page, 1500);
  await shot(page, 'detail');
  await page.getByText('Warranties', { exact: true }).last().click().catch(() => page.goBack());
  await wait(page, 1200);

  // Add a phone with the sample receipt, as a user would.
  await page.getByLabel(/add/i).first().click();
  await wait(page, 1500);
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Add proof').click();
  await (await chooser).setFiles(receipt);
  await wait(page, 1500);
  const optional = page.getByPlaceholder('Optional');
  await page.getByPlaceholder('Required').fill('Samsung Galaxy S25');
  await optional.nth(0).fill('Samsung');
  await optional.nth(1).fill('SM-S931B');
  await page.locator('input[type=date]').fill('2026-09-09');
  await optional.nth(3).fill('Sinar Elektrik');
  await page.locator('input').nth(7).fill('3899'); // price (placeholder uses a non-breaking space)
  await page.getByText('Use template').click();
  await wait(page);

  await page.evaluate(() => document.querySelectorAll('*').forEach((el) => el.scrollTop && (el.scrollTop = 0)));
  await page.evaluate(() => document.activeElement?.blur());
  await wait(page, 700);
  await shot(page, 'add-receipt');
  await page.getByText(/^warranty$/i).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await wait(page, 700);
  await shot(page, 'add-coverage');

  await page.getByText('Save', { exact: true }).click();
  await wait(page, 2000);
  await page.getByText('Samsung Galaxy S25').first().click();
  await wait(page, 1500);
  await shot(page, 'detail-new');
  await page.close();

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: scheme });
  await signIn(desktop);
  await desktop.screenshot({ path: path.join(dir, 'web-home.png') });
  await desktop.close();

  // Close-ups for the features grid (coordinates are in 2× pixels of a 390×844 screen).
  const crop = (src, name, region) =>
    sharp(path.join(dir, `${src}.png`)).extract({ left: 0, width: 780, ...region }).toFile(path.join(dir, `${name}.png`));
  await crop('home', 'crop-status', { top: 480, height: 640 });
  await crop('detail-new', 'crop-coverage', { top: 1112, height: 412 });
  await crop('detail-new', 'crop-vault', { top: 205, height: 830 });
  console.log(`${scheme}: done`);
}

await browser.close();
server.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Screenshots saved to ${path.relative(process.cwd(), out)}`);

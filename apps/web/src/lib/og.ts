// Social-sharing images (DESIGN §6): 1200×630 PNGs rendered at build time.
// satori lays the card out as SVG (text as paths), sharp rasterises it.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const WIDTH = 1200;
const HEIGHT = 630;

// Card colours are fixed to the light theme: shared previews don't follow the viewer's theme.
const colors = { bg: '#fafafb', text: '#111113', secondary: '#60646c', primary: '#0969da', border: '#d9d9e0' };

type Node = { type: string; props: Record<string, unknown> & { children?: Node | Node[] | string } };
const h = (type: string, style: Record<string, unknown>, children?: Node['props']['children'], extra = {}): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children, ...extra },
});

let assets: Promise<{ fonts: Parameters<typeof satori>[1]['fonts']; logo: string; side: string; hasPhoto: boolean }>;

function loadAssets() {
  assets ??= (async () => {
    const font = (weight: number) =>
      fs.readFile(require.resolve(`@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${weight}-normal.woff`));
    const root = process.cwd();
    const logoSvg = await fs.readFile(path.join(root, 'src/assets/logo/jaminly-mark.svg'));
    const photo = path.join(root, 'src/assets/photos/og.jpg');
    const hasPhoto = await fs.stat(photo).then(() => true, () => false);
    // Right-hand side: the owner's photo when it exists, otherwise the real Home screenshot.
    const side = hasPhoto
      ? await sharp(photo).resize(540, HEIGHT, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer()
      : await sharp(path.join(root, 'src/assets/screens/light/home.png')).resize(380).png().toBuffer();
    return {
      fonts: [
        { name: 'Jakarta', data: await font(500), weight: 500, style: 'normal' },
        { name: 'Jakarta', data: await font(800), weight: 800, style: 'normal' },
      ],
      logo: `data:image/svg+xml;base64,${logoSvg.toString('base64')}`,
      side: `data:image/${hasPhoto ? 'jpeg' : 'png'};base64,${side.toString('base64')}`,
      hasPhoto,
    };
  })();
  return assets;
}

export async function renderOgImage({ title, subtitle }: { title: string; subtitle: string }) {
  const { fonts, logo, side, hasPhoto } = await loadAssets();

  const text = h(
    'div',
    { flexDirection: 'column', justifyContent: 'space-between', width: hasPhoto ? 660 : 760, height: '100%', padding: '64px 0 56px 72px' },
    [
      h('div', { alignItems: 'center', gap: 16 }, [
        h('img', { width: 56, height: 56 }, undefined, { src: logo, width: 56, height: 56 }),
        h('div', { fontSize: 36, fontWeight: 800, color: colors.text }, 'Jaminly'),
      ]),
      h('div', { flexDirection: 'column', gap: 20 }, [
        h('div', { fontSize: title.length > 34 ? 56 : 68, fontWeight: 800, color: colors.text, lineHeight: 1.08, letterSpacing: '-0.02em' }, title),
        h('div', { fontSize: 28, fontWeight: 500, color: colors.secondary, lineHeight: 1.4 }, subtitle),
      ]),
      h('div', { fontSize: 26, fontWeight: 500, color: colors.primary }, 'jaminly.app'),
    ],
  );

  const visual = hasPhoto
    ? h('img', { width: 540, height: HEIGHT, objectFit: 'cover' }, undefined, { src: side, width: 540, height: HEIGHT })
    : h('div', { flex: 1, justifyContent: 'center', paddingTop: 72 }, [
        h(
          'img',
          { width: 340, borderRadius: 20, border: `1px solid ${colors.border}`, boxShadow: '0 24px 60px -20px rgba(9,105,218,0.25)' },
          undefined,
          { src: side, width: 340, height: 736 },
        ),
      ]);

  const svg = await satori(h('div', { width: '100%', height: '100%', backgroundColor: colors.bg, overflow: 'hidden' }, [text, visual]) as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/** Public URL of a page's sharing image, e.g. `/og/ms/privacy.png`. */
export function ogImagePath(locale: string, path: string) {
  const page = path === '/' || path === '/404' ? 'home' : path.replace(/^\//, '');
  return `/og/${locale}/${page}.png`;
}

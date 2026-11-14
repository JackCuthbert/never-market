import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const svg = readFileSync(join(root, 'assets/icon.svg'), 'utf8');
const dot = (colour: string): string =>
  svg
    .replace(
      '<g id="art">',
      '<mask id="dot"><rect width="128" height="128" fill="#fff"/><circle cx="100" cy="100" r="35"/></mask><g id="art" mask="url(#dot)">',
    )
    .replace('</svg>', `<circle cx="100" cy="100" r="25" fill="${colour}"/></svg>`);
const on = dot('#22a559');
const off = dot('#8b949e');

const icons = join(root, 'assets/icons');
const previews = join(root, 'test-results/logo');
mkdirSync(icons, { recursive: true });
mkdirSync(previews, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();

async function render(markup: string, size: number, background?: string): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:${background ?? 'transparent'}}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  );
  return page.screenshot({ omitBackground: !background });
}

for (const size of [16, 32, 48, 128]) writeFileSync(join(icons, `icon-${size}.png`), await render(svg, size));
for (const size of [16, 32]) {
  writeFileSync(join(icons, `on-${size}.png`), await render(on, size));
  writeFileSync(join(icons, `off-${size}.png`), await render(off, size));
}

writeFileSync(join(previews, 'logo-128.png'), await render(svg, 128, '#ffffff'));
for (const [theme, background] of [['light', '#f1f3f4'], ['dark', '#35363a']] as const) {
  writeFileSync(join(previews, `toolbar-on-32-${theme}.png`), await render(on, 32, background));
  writeFileSync(join(previews, `toolbar-off-32-${theme}.png`), await render(off, 32, background));
}
await browser.close();

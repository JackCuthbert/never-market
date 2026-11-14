import test from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type ContentScript = { matches: string[]; run_at: string; js: string[] };
type Manifest = {
  manifest_version: number;
  name: string;
  permissions: string[];
  host_permissions: string[];
  background: { service_worker: string; scripts: string[] };
  icons: Record<string, string>;
  action: { default_icon: Record<string, string> };
  browser_specific_settings: { gecko: { id: string } };
  content_scripts: ContentScript[];
};

const out = join(mkdtempSync(join(tmpdir(), 'never-market-')), 'dist');
execFileSync('node', [join(import.meta.dirname, '../../scripts/build.ts'), out]);
const manifest: Manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));

const hosts = {
  bunnings: 'www.bunnings.com.au',
  jbhifi: 'www.jbhifi.com.au',
  woolworths: 'www.woolworths.com.au',
  bigw: 'www.bigw.com.au',
};

test('manifest basics', () => {
  assert.strictEqual(manifest.manifest_version, 3);
  assert.strictEqual(manifest.name, 'Never Market');
  assert.deepStrictEqual(manifest.permissions, ['storage']);
  assert.deepStrictEqual(manifest.host_permissions, manifest.content_scripts.flatMap((c) => c.matches));
  assert.ok(manifest.browser_specific_settings.gecko.id);
});

test('one content script entry per site', () => {
  assert.strictEqual(manifest.content_scripts.length, Object.keys(hosts).length);
  for (const [store, host] of Object.entries(hosts)) {
    assert.deepStrictEqual(manifest.content_scripts.find((c) => c.js.includes(`rules/${store}.js`)), {
      matches: [`https://${host}/*`],
      run_at: 'document_start',
      js: [`rules/${store}.js`],
    });
  }
});

test('rule script bundles the rule', () => {
  assert.match(readFileSync(join(out, 'rules/bunnings.js'), 'utf8'), /productranges/);
});

test('icons and background script are built', () => {
  assert.deepStrictEqual(Object.keys(manifest.icons), ['16', '32', '48', '128']);
  assert.deepStrictEqual(manifest.background, { service_worker: 'background.js', scripts: ['background.js'] });
  const files = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon), 'background.js'];
  for (const size of [16, 32]) files.push(`icons/on-${size}.png`, `icons/off-${size}.png`);
  for (const file of files) assert.ok(existsSync(join(out, file)), file);
});

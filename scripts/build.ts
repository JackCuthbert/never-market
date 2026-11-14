import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Rule } from '../src/types.ts';

const root = join(import.meta.dirname, '..');
const out = process.argv[2] ?? join(root, 'dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'rules'), { recursive: true });

const manifest: Record<string, unknown> = JSON.parse(readFileSync(join(root, 'manifest.base.json'), 'utf8'));
const contentScripts = [];
const stores: { name: string; url: string }[] = [];

for (const file of readdirSync(join(root, 'sites')).filter((f) => f.endsWith('.json'))) {
  const store = basename(file, '.json');
  const rule: Rule = JSON.parse(readFileSync(join(root, 'sites', file), 'utf8'));
  await build({
    stdin: {
      contents: `import { start } from ${JSON.stringify(join(root, 'src/engine.ts'))};\nstart(${JSON.stringify(rule)});\n`,
      resolveDir: root,
    },
    outfile: join(out, 'rules', `${store}.js`),
    bundle: true,
    format: 'iife',
    target: 'chrome105',
  });
  stores.push({ name: rule.name, url: `https://${rule.hosts[0]}/` });
  contentScripts.push({
    matches: rule.hosts.map((host) => `https://${host}/*`),
    run_at: 'document_start',
    js: [`rules/${store}.js`],
  });
}
manifest['content_scripts'] = contentScripts;
manifest['host_permissions'] = contentScripts.flatMap((c) => c.matches);

if (existsSync(join(root, 'popup'))) {
  mkdirSync(join(out, 'popup'), { recursive: true });
  cpSync(join(root, 'popup/popup.html'), join(out, 'popup/popup.html'));
  if (existsSync(join(root, 'popup/popup.ts'))) {
    await build({
      entryPoints: [join(root, 'popup/popup.ts')],
      outfile: join(out, 'popup/popup.js'),
      bundle: true,
      format: 'iife',
      target: 'chrome105',
    });
  }
}

await build({
  entryPoints: [join(root, 'src/background.ts')],
  outfile: join(out, 'background.js'),
  bundle: true,
  format: 'iife',
  target: 'chrome105',
});
cpSync(join(root, 'assets/icons'), join(out, 'icons'), { recursive: true });

writeFileSync(join(out, 'stores.json'), JSON.stringify(stores) + '\n');
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

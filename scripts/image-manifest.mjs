#!/usr/bin/env node
// Lists the responsive widths generated for each image (public/assets/{catalog,site}/<name>-<w>.webp)
// into src/lib/images.manifest.json, which <Picture> uses to build srcsets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = {};
for (const dir of ['catalog', 'site']) {
  const abs = path.join(ROOT, 'public/assets', dir);
  const files = await fs.readdir(abs, { recursive: true }).catch(() => []);
  for (const f of files) {
    const m = /^(.*)-(\d+)\.webp$/.exec(f.split(path.sep).join('/'));
    if (!m) continue;
    const key = `${dir}/${m[1]}`;
    (manifest[key] ??= []).push(Number(m[2]));
  }
}
for (const k of Object.keys(manifest)) manifest[k].sort((a, b) => a - b);
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(path.join(ROOT, 'src/lib/images.manifest.json'), JSON.stringify(sorted, null, 0) + '\n');
console.log(`images.manifest.json: ${Object.keys(sorted).length} images`);

#!/usr/bin/env node
/**
 * Image optimisation pipeline. See docs/images.md.
 *
 * Inputs:  every .jpg/.jpeg/.png under originals/ (git-ignored, full-size photos) and public/assets
 *          (skipping the generated public/assets/catalog and public/assets/site).
 * Outputs: public/assets/catalog/<name>.jpg + <name>-{480,960,1440}.{webp,avif}
 *          for product images (those referenced as `image` in the backend seed
 *          catalog.json), public/assets/site/... for everything else.
 *
 * Idempotent: an output newer than its source is skipped.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIRS = ['originals', 'public/assets'].map((d) => path.join(ROOT, d));
const SKIP_DIRS = ['public/assets/catalog', 'public/assets/site'].map((d) => path.join(ROOT, d));
const OUT_CATALOG = path.join(ROOT, 'public/assets/catalog');
const OUT_SITE = path.join(ROOT, 'public/assets/site');
const CATALOG_JSON =
  process.env.CATALOG_JSON ||
  path.resolve(ROOT, '../sport-backend/src/db/seed/data/catalog.json');

const MAX_FALLBACK_WIDTH = 1600;
const SRCSET_WIDTHS = [480, 960, 1440];
const JPEG = { quality: 78, mozjpeg: true };
const WEBP = { quality: 75 };
const AVIF = { quality: 50 };
const CONCURRENCY = 4;

const exists = (p) => fs.stat(p).then(() => true, () => false);

async function walk(dir) {
  if (SKIP_DIRS.some((s) => dir === s || dir.startsWith(s + path.sep))) return [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(jpe?g|png)$/i.test(e.name)) out.push(full);
  }
  return out;
}

async function loadProductBasenames() {
  let raw;
  try {
    raw = await fs.readFile(CATALOG_JSON, 'utf8');
  } catch {
    console.warn(
      `! Could not read ${CATALOG_JSON}; treating every image as a site image. ` +
        'Set CATALOG_JSON=/path/to/catalog.json to override.',
    );
    return new Set();
  }
  const products = JSON.parse(raw);
  const names = new Set();
  for (const p of products) {
    if (typeof p.image === 'string') names.add(path.basename(p.image));
  }
  return names;
}

async function isFresh(out, srcMtimeMs) {
  try {
    return (await fs.stat(out)).mtimeMs >= srcMtimeMs;
  } catch {
    return false;
  }
}

async function processImage(src, outDir, stats) {
  const base = path.basename(src).replace(/\.[^.]+$/, '');
  const srcStat = await fs.stat(src);
  const meta = await sharp(src).metadata();
  const srcWidth = meta.width ?? MAX_FALLBACK_WIDTH;
  await fs.mkdir(outDir, { recursive: true });

  // Never upscale: only emit widths the source can satisfy. A source narrower
  // than 480px still gets a -480 variant (at its native width).
  let widths = SRCSET_WIDTHS.filter((w) => w <= srcWidth);
  if (widths.length === 0) widths = [SRCSET_WIDTHS[0]];

  const jobs = [
    {
      out: path.join(outDir, `${base}.jpg`),
      width: Math.min(MAX_FALLBACK_WIDTH, srcWidth),
      fmt: 'jpg',
    },
    ...widths.flatMap((w) => [
      { out: path.join(outDir, `${base}-${w}.webp`), width: Math.min(w, srcWidth), fmt: 'webp' },
      { out: path.join(outDir, `${base}-${w}.avif`), width: Math.min(w, srcWidth), fmt: 'avif' },
    ]),
  ];

  for (const job of jobs) {
    if (await isFresh(job.out, srcStat.mtimeMs)) {
      stats.skipped += 1;
      const { size } = await fs.stat(job.out);
      stats.after += size;
      continue;
    }
    let pipe = sharp(src).rotate().resize({ width: job.width, withoutEnlargement: true });
    if (job.fmt === 'jpg') pipe = pipe.flatten({ background: '#ffffff' }).jpeg(JPEG);
    else if (job.fmt === 'webp') pipe = pipe.webp(WEBP);
    else pipe = pipe.avif(AVIF);
    await pipe.toFile(job.out);
    const { size } = await fs.stat(job.out);
    stats.written += 1;
    stats.after += size;
  }
}

async function pool(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) await worker(queue.shift());
    }),
  );
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);

async function main() {
  const productNames = await loadProductBasenames();
  const sources = [];
  for (const d of INPUT_DIRS) sources.push(...(await walk(d)));

  const seen = new Map();
  const tasks = [];
  for (const src of sources) {
    const kind = productNames.has(path.basename(src)) ? 'catalog' : 'site';
    const stem = path.basename(src).replace(/\.[^.]+$/, '');
    const key = `${kind}/${stem}`;
    if (seen.has(key)) {
      console.warn(`! Duplicate output name ${key}: ${src} ignored (already from ${seen.get(key)})`);
      continue;
    }
    seen.set(key, src);
    tasks.push({ src, kind });
  }

  const summary = {
    catalog: { files: 0, before: 0, after: 0, written: 0, skipped: 0 },
    site: { files: 0, before: 0, after: 0, written: 0, skipped: 0 },
  };

  await pool(tasks, async ({ src, kind }) => {
    const s = summary[kind];
    s.files += 1;
    const { size } = await fs.stat(src);
    s.before += size;
    await processImage(src, kind === 'catalog' ? OUT_CATALOG : OUT_SITE, s);
  });

  const total = { files: 0, before: 0, after: 0, written: 0, skipped: 0 };
  for (const [kind, s] of Object.entries(summary)) {
    console.log(
      `${kind.padEnd(8)} ${String(s.files).padStart(3)} sources  ${mb(s.before)} MB -> ${mb(s.after)} MB ` +
        `(${s.written} written, ${s.skipped} up to date)`,
    );
    for (const k of Object.keys(total)) total[k] += s[k];
  }
  console.log(
    `${'total'.padEnd(8)} ${String(total.files).padStart(3)} sources  ${mb(total.before)} MB -> ${mb(total.after)} MB ` +
      `(${total.written} written, ${total.skipped} up to date)`,
  );
  if (!(await exists(OUT_CATALOG)) && !(await exists(OUT_SITE))) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

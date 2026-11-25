# Image pipeline

`npm run images` runs `scripts/optimize-images.mjs` (uses `sharp`). It is
idempotent: an output that is newer than its source is skipped.

## Inputs

Every `.jpg`, `.jpeg` and `.png` under `src/assets/images/` and `public/assets/`
(recursively; the generated `public/assets/catalog/` and `public/assets/site/`
are skipped). The original files are kept for now because the current mock data
still imports them.

## Outputs

| Kind | Output directory | Which images |
| --- | --- | --- |
| Product | `public/assets/catalog/` | files whose basename is the `image` of a product in `sport-backend/src/db/seed/data/catalog.json` |
| Site | `public/assets/site/` | everything else (editorial, gift card, banners, ...) |

The catalog path is read from `../sport-backend/src/db/seed/data/catalog.json`;
override with `CATALOG_JSON=/path/to/catalog.json npm run images`.

For an input `<name>.<ext>` the script writes:

```
<name>.jpg                  fallback, max width 1600, mozjpeg q78
<name>-480.webp   <name>-480.avif
<name>-960.webp   <name>-960.avif
<name>-1440.webp  <name>-1440.avif
```

WebP is quality 75, AVIF quality 50. Images are never upscaled: a width
variant is only written if the source is at least that wide (a source narrower
than 480px still gets a `-480` variant at its native size). Most current
sources are about 1024px wide, so most images have `-480` and `-960` only, and
`-1440` is the exception. Build `srcset` from the variants that exist, or
probe with the `<picture>` fallback below. PNG sources are flattened onto white
for the `.jpg` fallback.

## Using it from the frontend

The backend serves product images as `/assets/catalog/<name>.jpg`. Derive the
variants from that URL by swapping the extension and adding the width suffix:

```tsx
function catalogSrcSet(jpgUrl: string, format: 'webp' | 'avif', widths = [480, 960]) {
  const base = jpgUrl.replace(/\.jpg$/, '');
  return widths.map((w) => `${base}-${w}.${format} ${w}w`).join(', ');
}

<picture>
  <source type="image/avif" srcSet={catalogSrcSet(url, 'avif')} sizes="(min-width: 1024px) 25vw, 50vw" />
  <source type="image/webp" srcSet={catalogSrcSet(url, 'webp')} sizes="(min-width: 1024px) 25vw, 50vw" />
  <img src={url} alt={name} loading="lazy" decoding="async" />
</picture>
```

Site images use the same scheme under `/assets/site/<name>.jpg`.
`public/` is served from the site root by Vite, and the dev proxy only forwards
`/v1`, so `/assets/catalog/*` resolves from `public/` in development.

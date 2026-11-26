import generated from './images.manifest.json';

export type ImageManifest = Record<string, number[]>;
export const IMAGE_MANIFEST: ImageManifest = generated as ImageManifest;

const KEY = /^(.*?)((?:catalog|site)\/.+)\.(?:jpe?g|png)$/i;

/** AVIF and WebP srcsets for an optimised image; empty when only the JPG exists. */
export function srcSetFor(src: string, manifest: ImageManifest = IMAGE_MANIFEST): { avif?: string; webp?: string } {
  const m = KEY.exec(src);
  if (!m) return {};
  const [, prefix, key] = m as unknown as [string, string, string];
  const widths = manifest[key];
  if (!widths?.length) return {};
  const set = (ext: string) => widths.map((w) => `${prefix}${key}-${w}.${ext} ${w}w`).join(', ');
  return { avif: set('avif'), webp: set('webp') };
}

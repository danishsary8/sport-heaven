import { srcSetFor } from '../lib/images';
import { cx } from './cx';

export interface PictureProps {
  src: string | null | undefined;
  alt: string;
  /** The `sizes` attribute, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  /** Above-the-fold images load eagerly with high priority. */
  priority?: boolean;
  width?: number;
  height?: number;
  className?: string;
  imgClassName?: string;
}

/** AVIF/WebP with JPG fallback. Without a source it shows a neutral block (never a broken image). */
export function Picture({ src, alt, sizes, priority = false, width = 960, height = 1200, className, imgClassName }: PictureProps) {
  if (!src) return <div aria-hidden className={cx('bg-stone', className, imgClassName)} />;
  const set = srcSetFor(src);
  return (
    <picture className={className}>
      {set.avif && <source type="image/avif" srcSet={set.avif} sizes={sizes} />}
      {set.webp && <source type="image/webp" srcSet={set.webp} sizes={sizes} />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        className={cx('block h-full w-full object-cover', imgClassName)}
      />
    </picture>
  );
}

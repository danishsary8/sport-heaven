import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { useI18n } from '../../../lib/i18n';
import { Picture, cx } from '../../../ui';
import type { ProductDetail } from '../api';

const MAIN_SIZES = '(min-width: 1024px) 46vw, 100vw';

/**
 * Photos for the chosen colour.
 * - Phones: a swipe carousel with dots.
 * - Desktop: thumbnails down the left and one main photo, capped in height so the buy box stays in
 *   view beside it; arrows and thumbnails crossfade between photos.
 */
export function Gallery({ images, color, name }: { images: ProductDetail['images']; color: string; name: string }) {
  const { t } = useI18n();
  const forColor = images.filter((i) => i.colorName === color);
  const shown = forColor.length ? forColor : images;
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLUListElement>(null);
  const current = Math.min(index, Math.max(shown.length - 1, 0));
  const many = shown.length > 1;

  if (shown.length === 0) return <div aria-hidden className="stage aspect-[4/5] lg:rounded-[10px]" />;

  const go = (i: number) => setIndex((i + shown.length) % shown.length);

  return (
    <div className="relative">
      {/* Phones */}
      <ul
        ref={track}
        aria-label={t('product.photos')}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {shown.map((img, i) => (
          <li key={img.url} className="w-full shrink-0 snap-center">
            <Picture src={img.url} alt={img.alt ?? name} sizes="100vw" priority={i === 0} className="stage block aspect-[4/5] w-full overflow-hidden" />
          </li>
        ))}
      </ul>
      {many && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
          {shown.map((img, i) => (
            <span key={img.url} className={cx('h-1.5 rounded-full transition-all', i === current ? 'w-5 bg-obsidian' : 'w-1.5 bg-obsidian/25')} />
          ))}
        </div>
      )}

      {/* Desktop */}
      <div className={cx('hidden lg:grid lg:gap-4', many ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-1')}>
        {many && (
          <ul aria-label={t('product.photos')} className="flex max-h-[calc((100vw-4rem)*0.6)] flex-col gap-3 overflow-y-auto [scrollbar-width:none]">
            {shown.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t('product.photoN', { n: i + 1 })}
                  aria-current={i === current ? 'true' : undefined}
                  className={cx(
                    'stage block aspect-[3/4] w-full overflow-hidden rounded-[6px] ring-offset-2 ring-offset-paper transition',
                    i === current ? 'ring-2 ring-obsidian' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <Picture src={img.url} alt="" sizes="76px" className="block h-full w-full" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[10px]">
          {shown.map((img, i) => (
            <Picture
              key={img.url}
              src={img.url}
              alt={i === current ? (img.alt ?? name) : ''}
              sizes={MAIN_SIZES}
              priority={i === 0}
              className={cx('stage absolute inset-0 block transition-opacity duration-500', i === current ? 'opacity-100' : 'pointer-events-none opacity-0')}
            />
          ))}
          {many && (
            <>
              <GalleryArrow side="left" label={t('product.prevPhoto')} onClick={() => go(current - 1)} />
              <GalleryArrow side="right" label={t('product.nextPhoto')} onClick={() => go(current + 1)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryArrow({ side, label, onClick }: { side: 'left' | 'right'; label: string; onClick(): void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-obsidian shadow-[0_4px_16px_-6px_rgb(14_17_19/0.4)] transition-opacity hover:bg-paper focus-visible:opacity-100 group-hover:opacity-100 lg:opacity-0',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

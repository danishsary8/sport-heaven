import { useRef, useState } from 'react';
import { useI18n } from '../../../lib/i18n';
import { Picture, cx } from '../../../ui';
import type { ProductDetail } from '../api';

/** Photos for the chosen colour: a swipe carousel with dots on phones, a two-column grid on desktop. */
export function Gallery({ images, color, name }: { images: ProductDetail['images']; color: string; name: string }) {
  const { t } = useI18n();
  const forColor = images.filter((i) => i.colorName === color);
  const shown = forColor.length ? forColor : images;
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLUListElement>(null);

  if (shown.length === 0) return <div aria-hidden className="aspect-[3/4] bg-stone lg:rounded-[8px]" />;

  return (
    <div className="relative">
      <ul
        ref={track}
        aria-label={t('product.photos')}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {shown.map((img, i) => (
          <li key={img.url} className={cx('w-full shrink-0 snap-center lg:w-auto', shown.length === 1 && 'lg:col-span-2')}>
            <Picture
              src={img.url}
              alt={img.alt ?? name}
              sizes="(min-width: 1024px) 34vw, 100vw"
              priority={i === 0}
              className="block aspect-[3/4] w-full overflow-hidden bg-stone lg:rounded-[8px]"
            />
          </li>
        ))}
      </ul>
      {shown.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
          {shown.map((img, i) => (
            <span key={img.url} className={cx('size-2 rounded-full', i === index ? 'bg-obsidian' : 'bg-obsidian/25')} />
          ))}
        </div>
      )}
    </div>
  );
}

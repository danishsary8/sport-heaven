import { Link } from 'react-router';
import { useI18n } from '../../../../lib/i18n';
import { CONTAINER, Picture, cx } from '../../../../ui';
import { useMenu } from '../../api';
import { CATEGORY_IMAGE_FOCUS, CATEGORY_IMAGES } from '../../categoryImages';
import type { SlugListContent } from '../sections';
import { SectionHead } from './SectionHead';

const TILE_SIZES = '(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw';

/** Category tiles with a product photo, the category name and how many products it has. */
export function CategoryGrid({ content }: { content: SlugListContent }) {
  const { t } = useI18n();
  const menu = useMenu();
  const id = 'home-categories';
  const cats = content.slugs.map((slug) => menu.data?.categories.find((c) => c.slug === slug) ?? { slug, name: slug, productCount: null });
  if (cats.length === 0) return null;
  return (
    <section aria-labelledby={id} className={CONTAINER}>
      <SectionHead id={id} title={content.title} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {cats.map((c, i) => {
          const image = CATEGORY_IMAGES[c.slug];
          // With an odd count, the first tile runs the full width on phones so the grid has no gap.
          const wide = i === 0 && cats.length % 2 === 1;
          return (
            <li key={c.slug} className={cx(wide && 'max-sm:col-span-2')}>
              <Link
                to={`/c/${encodeURIComponent(c.slug)}`}
                className={cx(
                  'stage group relative isolate flex h-full flex-col overflow-hidden rounded-[8px] p-4 transition-colors hover:bg-[#E2DED4] lg:p-5',
                  image ? (wide ? 'aspect-[2/1] sm:aspect-[4/5]' : 'aspect-[4/5]') : 'min-h-28 justify-between lg:min-h-36',
                )}
              >
                <span className="relative z-10 font-display text-[26px] font-bold leading-[0.95] lg:text-[28px]">{c.name}</span>
                {c.productCount != null && <span className="tabular relative z-10 mt-1 text-sm text-graphite">{t('listing.count', { n: c.productCount })}</span>}
                {image && (
                  <Picture
                    src={image}
                    alt=""
                    sizes={TILE_SIZES}
                    className={cx(
                      'absolute inset-x-0 bottom-0 h-[72%] [mask-image:linear-gradient(to_bottom,transparent,black_28%)]',
                      wide && 'max-sm:left-auto max-sm:h-full max-sm:w-[58%] max-sm:[mask-image:linear-gradient(to_right,transparent,black_30%)]',
                    )}
                    imgClassName="object-cover object-[50%_65%] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    imgStyle={CATEGORY_IMAGE_FOCUS[c.slug] ? { objectPosition: CATEGORY_IMAGE_FOCUS[c.slug] } : undefined}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

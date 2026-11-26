import { CONTAINER } from '../../../../ui';
import { ProductCard } from '../../ProductCard';
import { headingId, type RailContent } from '../sections';
import { SectionHead } from './SectionHead';

/** Up to eight products: a swipe row on phones, a 4-column grid on desktop. Hidden when empty. */
export function ProductRail({ content }: { content: RailContent }) {
  const { title, products, href } = content;
  if (products.length === 0) return null;
  const id = headingId('rail', title);
  return (
    <section aria-labelledby={id} className={CONTAINER}>
      <SectionHead id={id} title={title} href={href} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [contain:paint] [scroll-padding-inline:16px] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
        {products.slice(0, 8).map((p) => (
          <li key={p.id} className="w-[44vw] max-w-[240px] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

import { Link } from 'react-router';
import { CONTAINER } from '../../../../ui';
import { useMenu } from '../../api';
import type { SlugListContent } from '../sections';
import { SectionHead } from './SectionHead';

/** Brand links; with no slugs in the payload, every brand in the menu. */
export function BrandRow({ content }: { content: SlugListContent }) {
  const menu = useMenu();
  const id = 'home-brands';
  const all = menu.data?.brands ?? [];
  const slugs = content.slugs.length ? content.slugs : all.map((b) => b.slug);
  const brands = slugs.map((slug) => all.find((b) => b.slug === slug) ?? { slug, name: slug });
  if (brands.length === 0) return null;
  return (
    <section aria-labelledby={id} className={CONTAINER}>
      <SectionHead id={id} title={content.title} />
      <ul className="flex flex-wrap gap-2">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link
              to={`/brands/${encodeURIComponent(b.slug)}`}
              className="inline-flex h-11 items-center rounded-full border border-[#C9C5BB] px-5 font-semibold transition-colors hover:border-obsidian hover:bg-paper"
            >
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

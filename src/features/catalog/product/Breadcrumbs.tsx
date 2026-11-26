import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { useMenu, type ProductDetail } from '../api';
import { productCrumbs } from './crumbs';

/** The way back from a product page to its category and brand, plus matching schema.org data for search engines. */
export function Breadcrumbs({ product, className }: { product: ProductDetail; className?: string }) {
  const { t } = useI18n();
  const menu = useMenu();
  const categoryName = menu.data?.categories.find((c) => c.slug === product.category)?.name;
  const crumbs = productCrumbs(product, categoryName, t('product.crumbHome'));
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: `${origin}${c.to}` })),
  };
  return (
    <nav aria-label={t('product.breadcrumb')} className={className}>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-graphite">
        {crumbs.map((c, i) => (
          <li key={c.to} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-graphite/70" aria-hidden />}
            <Link to={c.to} className="underline-offset-4 hover:text-obsidian hover:underline">
              {c.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { useParams, useSearchParams } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { Seo } from '../../../ui';
import { useCollection, useMenu } from '../api';
import { valueLabel } from '../filterLabels';
import { subCategory } from './facets';
import { ListingView } from './ListingView';

export function ShopPage() {
  const { t } = useI18n();
  return (
    <>
      <Seo title={t('listing.shopAll')} canonical="/shop" />
      <ListingView title={t('listing.shopAll')} base={{}} />
    </>
  );
}

export function CategoryPage() {
  const { t } = useI18n();
  const { category = '' } = useParams();
  const [params] = useSearchParams();
  const menu = useMenu();
  const name = menu.data?.categories.find((c) => c.slug === category)?.name ?? humanise(category);
  // /c/jerseys?league=Premier League is titled "Premier League", with the category as the intro.
  const sub = subCategory(params);
  const title = sub ? valueLabel(sub.key, sub.value, t) : name;
  return (
    <>
      <Seo title={sub ? `${title} | ${name}` : name} canonical={`/c/${category}`} />
      <ListingView key={category} title={title} intro={sub ? name : undefined} base={{ category }} />
    </>
  );
}

export function BrandPage() {
  const { slug = '' } = useParams();
  const menu = useMenu();
  const name = menu.data?.brands.find((b) => b.slug === slug)?.name ?? humanise(slug);
  return (
    <>
      <Seo title={name} canonical={`/brands/${slug}`} />
      <ListingView key={slug} title={name} base={{ brand: [slug] }} hidden={['brand']} />
    </>
  );
}

export function CollectionPage() {
  const { slug = '' } = useParams();
  const collection = useCollection(slug);
  const name = collection.data?.collection.name ?? humanise(slug);
  return (
    <>
      <Seo title={name} description={collection.data?.collection.description ?? undefined} canonical={`/collections/${slug}`} />
      <ListingView key={slug} title={name} intro={collection.data?.collection.description} base={{ collection: slug }} />
    </>
  );
}

function humanise(slug: string): string {
  const s = slug.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

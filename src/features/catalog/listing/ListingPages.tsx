import { useParams } from 'react-router';
import { useI18n } from '../../../lib/i18n';
import { Seo } from '../../../ui';
import { useCollection, useMenu } from '../api';
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
  const { category = '' } = useParams();
  const menu = useMenu();
  const name = menu.data?.categories.find((c) => c.slug === category)?.name ?? humanise(category);
  return (
    <>
      <Seo title={name} canonical={`/c/${category}`} />
      <ListingView key={category} title={name} base={{ category }} />
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

import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { isApiError } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { Availability, Button, EmptyState, JsonLd, Price, QueryView, Seo, Skeleton, useToast } from '../../../ui';
import { useAddToCart } from '../../cart/api';
import { useProduct, type ProductDetail, type Variant } from '../api';
import { ProductCard } from '../ProductCard';
import { Breadcrumbs } from './Breadcrumbs';
import { Gallery } from './Gallery';
import { ProductDetails } from './ProductDetails';
import { QuestionsSection } from './Questions';
import { SizeGuideButton } from './SizeGuide';
import { StoreAvailability } from './StoreAvailability';
import { WishlistButton } from './WishlistButton';
import { PrintStudio } from '../print/PrintStudio';
import { EMPTY_PRINT, printChoice, type PrintState } from '../print/printState';
import { sortSizes } from './sizes';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { t } = useI18n();
  const product = useProduct(slug);
  if (product.isError && isApiError(product.error) && product.error.status === 404) {
    return (
      <section className="mx-auto max-w-[1320px] px-4 py-10 lg:px-8">
        <Seo title={t('product.notFound')} noindex />
        <EmptyState
          title={t('product.notFound')}
          body={t('product.notFoundBody')}
          action={
            <Link to="/shop" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
              {t('listing.shopAll')}
            </Link>
          }
        />
      </section>
    );
  }
  return (
    <QueryView query={product} skeleton={<ProductSkeleton />}>
      {(data) => <ProductView key={data.product.id} product={data.product} />}
    </QueryView>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 lg:grid-cols-[1.3fr_1fr] lg:px-8">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
    </div>
  );
}

/** The colour shown first: the one in the URL, else the first with something in stock. */
function initialColor(product: ProductDetail, fromUrl: string | null): string {
  const names = product.colors.map((c) => c.name);
  if (fromUrl && names.includes(fromUrl)) return fromUrl;
  return names.find((n) => product.variants.some((v) => v.color === n && v.availability !== 'out')) ?? names[0] ?? '';
}

function ProductView({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const color = initialColor(product, params.get('color'));
  const [size, setSize] = useState<string | null>(null);
  const [print, setPrint] = useState<PrintState>(EMPTY_PRINT);
  const customPrint = printChoice(print);
  const add = useAddToCart();

  const variants = product.variants.filter((v) => v.color === color);
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))]);
  const chosen: Variant | undefined = size ? variants.find((v) => v.size === size) : undefined;
  const priceCents = chosen?.priceCents ?? product.priceCents;
  const compareAt = chosen ? chosen.compareAtCents : product.compareAtCents;
  const soldOut = variants.every((v) => v.availability === 'out');

  const chooseColor = (name: string) => {
    setSize(null);
    const next = new URLSearchParams(params);
    next.set('color', name);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const addToBag = () => {
    if (!chosen || customPrint === 'invalid') return;
    add.mutate(
      { variantId: chosen.id, qty: 1, ...(customPrint ? { customPrint } : {}) },
      {
        onSuccess: () => toast.success(t('product.added')),
        onError: (e) => toast.error(isApiError(e) ? e.message : t('common.error')),
      },
    );
  };

  const buy = (
    <Button variant="buy" size="lg" block disabled={!chosen || chosen.availability === 'out' || customPrint === 'invalid'} loading={add.isPending} onClick={addToBag}>
      {t('product.add')}
    </Button>
  );

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: { '@type': 'Brand', name: product.brand.name },
    image: product.images.map((i) => `${origin}${i.url}`),
    description: product.description ?? undefined,
    sku: product.variants[0]?.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: (product.priceCents / 100).toFixed(2),
      availability: product.availability === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `${origin}/p/${product.slug}`,
    },
  };

  return (
    <article className="pb-28 lg:pb-16">
      <Seo title={product.name} description={product.description ?? undefined} canonical={`/p/${product.slug}`} image={product.imageUrl ?? undefined} />
      <JsonLd data={jsonLd} />
      <Breadcrumbs product={product} className="mx-auto max-w-[1320px] px-4 py-3 lg:px-8 lg:pb-0 lg:pt-6" />
      <div className="mx-auto max-w-[1320px] lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-12 lg:px-8 lg:pt-5">
        {/* On desktop the photos stay in view while the buy box and details scroll past. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Gallery images={product.images} color={color} name={product.name} />
        </div>

        <div className="px-4 pt-5 lg:px-0 lg:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to={`/brands/${product.brand.slug}`} className="text-[15px] text-graphite hover:underline">
                {product.brand.name}
              </Link>
              <h1 className="mt-1 text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] lg:text-[32px]">{product.name}</h1>
            </div>
            <WishlistButton slug={product.slug} />
          </div>
          <Price cents={priceCents} compareAtCents={compareAt} size="lg" className="mt-4" />

          {product.colors.length > 0 && (
            <div className="mt-7 border-t border-stone pt-6">
              <p id="color-label" className="text-sm font-semibold">
                {t('product.colour')}: <span className="font-normal text-graphite">{color}</span>
              </p>
              <div role="radiogroup" aria-labelledby="color-label" className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <label key={c.name} className="cursor-pointer" title={c.name}>
                    <input type="radio" name="color" className="peer sr-only" checked={c.name === color} onChange={() => chooseColor(c.name)} aria-label={c.name} />
                    <span
                      aria-hidden
                      className="block size-10 rounded-full border-2 border-paper shadow-[0_0_0_1px_#C9C5BB] peer-checked:shadow-[0_0_0_2px_#0E1113] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-obsidian"
                      style={{ background: c.swatchHex ?? '#EAE7DF' }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <p id="size-label" className="text-sm font-semibold">
                {t('product.size')}
              </p>
              {product.sizeGuide && <SizeGuideButton guide={product.sizeGuide} />}
            </div>
            <div role="radiogroup" aria-labelledby="size-label" className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {sizes.map((s) => {
                const v = variants.find((x) => x.size === s)!;
                const out = v.availability === 'out';
                return (
                  <label
                    key={s}
                    className={
                      'relative flex h-12 cursor-pointer items-center justify-center rounded-[6px] border font-display text-lg font-bold tracking-[0.01em] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-obsidian ' +
                      (out
                        ? 'cursor-not-allowed border-stone bg-stone/40 text-graphite/70 line-through decoration-1'
                        : size === s
                          ? 'border-obsidian bg-obsidian text-paper'
                          : 'border-[#C9C5BB] hover:border-obsidian')
                    }
                  >
                    <input type="radio" name="size" className="sr-only" disabled={out} checked={size === s} onChange={() => setSize(s)} aria-label={out ? `${s}, ${t('availability.out')}` : s} />
                    <span aria-hidden>{s}</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 min-h-6" aria-live="polite">
              {chosen ? (
                <Availability value={chosen.availability} count={chosen.lowStockCount} />
              ) : soldOut ? (
                <Availability value="out" />
              ) : (
                <p className="text-sm text-graphite">{t('product.chooseSize')}</p>
              )}
            </div>
          </div>

          {product.isCustomizable && <PrintStudio value={print} onChange={setPrint} swatch={product.colors.find((c) => c.name === color)?.swatchHex} />}

          <div className="mt-6 hidden lg:block">{buy}</div>
          <p className="mt-3 text-sm text-graphite">{t('product.pickupNote')}</p>

          <StoreAvailability variant={chosen} />
          <ProductDetails product={product} />
        </div>
      </div>

      {product.related.length > 0 && (
        <section aria-labelledby="related" className="mx-auto mt-16 max-w-[1320px] border-t border-stone px-4 pt-12 lg:mt-24 lg:px-8 lg:pt-16">
          <h2 id="related" className="mb-6 font-display text-[34px] font-bold leading-[0.95] lg:text-5xl">
            {t('product.related')}
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
            {product.related.slice(0, 4).map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <QuestionsSection slug={product.slug} />

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-stone bg-paper/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(14_17_19/0.18)] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <Price cents={priceCents} compareAtCents={compareAt} />
          <p className="truncate text-xs text-graphite">{size ?? t('product.chooseSizeShort')}</p>
        </div>
        <div className="ml-auto w-[58%]">{buy}</div>
      </div>
    </article>
  );
}


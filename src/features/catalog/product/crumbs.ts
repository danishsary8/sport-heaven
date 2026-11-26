import type { ProductDetail } from '../api';

export interface Crumb {
  label: string;
  to: string;
}

/** Home › category › brand for a product. The category name comes from the menu, else its slug. */
export function productCrumbs(product: Pick<ProductDetail, 'category' | 'brand'>, categoryName: string | undefined, home: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: home, to: '/' }];
  if (product.category) crumbs.push({ label: categoryName ?? product.category, to: `/c/${encodeURIComponent(product.category)}` });
  crumbs.push({ label: product.brand.name, to: `/brands/${encodeURIComponent(product.brand.slug)}` });
  return crumbs;
}

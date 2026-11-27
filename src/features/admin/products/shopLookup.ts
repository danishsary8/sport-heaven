import { apiFetch } from '../../../lib/api';
import type { AdminProduct, AdminProductListRow } from '../types';

/** The shop products with these web addresses, with their sizes and photos. Addresses not in the shop are left out. */
export async function findProducts(slugs: string[]): Promise<Map<string, AdminProduct>> {
  const found = new Map<string, AdminProduct>();
  for (const slug of new Set(slugs)) {
    const list = await apiFetch<{ products: AdminProductListRow[] }>('/v1/admin/products', { query: { q: slug, pageSize: 10 } });
    const hit = list.products.find((p) => p.slug === slug);
    if (hit) found.set(slug, (await apiFetch<{ product: AdminProduct }>(`/v1/admin/products/${hit.id}`)).product);
  }
  return found;
}

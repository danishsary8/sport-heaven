/** Old links from the previous site used hash routing ("/#/products/slug"): send them to the new pages. */
export function legacyHashTarget(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const product = /^#\/products?\/([a-z0-9-]+)/i.exec(hash);
  return product ? `/p/${product[1]!.toLowerCase()}` : '/';
}

// Writes public/sitemap.xml from the live API. Run before building for production:
//   SITE_URL=https://your-shop.example API_URL=https://api.your-shop.example node scripts/sitemap.mjs
import { writeFileSync } from 'node:fs';
import { buildSitemap } from './sitemap-lib.mjs';

const site = process.env.SITE_URL ?? 'https://sportcastle.com.kh';
const api = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const get = async (path) => {
  const res = await fetch(api + path);
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.json();
};

const menu = await get('/v1/catalog/menu');
const products = [];
for (let page = 1; ; page++) {
  const list = await get(`/v1/catalog/products?pageSize=48&page=${page}`);
  products.push(...list.products.map((p) => p.slug));
  if (products.length >= list.total || list.products.length === 0) break;
}
const xml = buildSitemap(site, { categories: menu.categories.map((c) => c.slug), brands: menu.brands.map((b) => b.slug), products });
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`sitemap.xml: ${products.length} products for ${site}`);

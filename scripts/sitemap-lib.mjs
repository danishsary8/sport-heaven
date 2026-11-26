const STATIC = ['/', '/shop', '/custom', '/stores', '/help', '/help/delivery', '/help/returns', '/help/size-guide', '/help/contact', '/help/about', '/track'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** sitemap.xml for the public pages (checkout, account, admin and orders are never listed). */
export function buildSitemap(siteUrl, { categories, brands, products }) {
  const base = siteUrl.replace(/\/+$/, '');
  const paths = [...STATIC, ...categories.map((c) => `/c/${c}`), ...brands.map((b) => `/brands/${b}`), ...products.map((p) => `/p/${p}`)];
  const urls = paths.map((p) => `  <url><loc>${esc(base + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

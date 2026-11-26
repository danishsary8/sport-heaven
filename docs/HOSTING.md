# Hosting the shop (static files)

`npm run build` makes `dist/`: plain files that any static host can serve. The shop uses real paths (`/p/adidas-f50`, `/account/orders`), so the host must answer every unknown path with `index.html` (an "SPA fallback"), while real files under `/assets/` are served as they are and missing ones stay 404.

The fallback is already configured for:

- **Netlify and Cloudflare Pages:** `public/_redirects` (copied into `dist/`).
- **Vercel:** `vercel.json` (also sets a one-year cache on `/assets/`, whose names change with every build).
- **nginx:**

  ```nginx
  location /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable"; }
  location / { try_files $uri /index.html; }
  ```

## Before each production build

1. Set the API address: `VITE_API_URL=https://api.<your-domain>` (see `.env.example`). The API must be on the same site as the shop (for example `shop.example.com` and `api.example.com`) so the bag cookie works.
2. Set the Firebase web keys (`VITE_FIREBASE_*`). Never set `VITE_AUTH_TEST_MODE` — the build refuses to finish if the test sign-in is inside.
3. Refresh the sitemap from the live API: `SITE_URL=https://<your-domain> API_URL=https://api.<your-domain> npm run sitemap`, and update the `Sitemap:` line in `public/robots.txt` to your domain.
4. `npm run build` and upload `dist/`.

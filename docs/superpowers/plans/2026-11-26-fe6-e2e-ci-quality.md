# FE6 — End-to-end tests, CI, hosting fallback, performance and accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ledger: `.superpowers/sdd/2026-11-26-fe6/progress.md`.

**Goal:** Prove the four shopping and staff journeys against the real backend in a browser, run every check in CI, make the static build deployable anywhere, and hit the spec's Lighthouse and accessibility bars.

**Architecture:** Playwright (`e2e/`) drives an e2e build of the shop (`npm run build:e2e`, served by `vite preview` on :4173) against the real backend on :3000 started with `AUTH_TEST_MODE=true`, the fake payment provider and a freshly migrated and seeded `sport_e2e` database. A global setup resets that database; helpers sign in through the real sign-in page (code 123456) and promote staff/admin users with SQL. A `scripts/check-bundle.mjs` gate runs after every production build. CI has two jobs: `checks` (typecheck, lint, unit, build + bundle check) and `e2e` (Postgres service, backend checked out from the same branch).

**Tech Stack:** Playwright 1.63 (pre-installed Chromium), `@axe-core/playwright`, `pg` (e2e SQL helper), Lighthouse CLI (via `npx`, uses `/opt/pw-browsers/chromium` locally), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-26-frontend-production-design.md` §2 (Lighthouse mobile ≥ 85 performance, ≥ 95 accessibility and best practices on home, listing, product), §5 (routing with SPA fallback, test sign-in only in test builds), §8 (testing and CI).

## Global Constraints

- e2e builds are the only builds that may contain the test sign-in; `npm run build` must fail if it does (bundle check).
- Initial JavaScript for `/` (entry chunk + its static imports) ≤ 150 kB gzipped (ruled in the ledger); no single lazy chunk ≥ 250 kB gzipped except the admin health charts.
- Lighthouse mobile: performance ≥ 85, accessibility ≥ 95, best practices ≥ 95 on `/`, `/c/boots`, `/p/<slug>`; record the numbers.
- axe: zero serious/critical violations on home, listing, product, bag, checkout, sign-in, account, admin overview.
- e2e uses only the `sport_e2e` database; never `sport_dev`.
- Money in integer cents from the API; customers see stock only as ok/low/out; no personal data in URLs or logs (unchanged).

## Review Focus

1. **Backend not running when e2e starts** — Playwright's `webServer` waits for `/health` with a 60 s timeout and the run fails with a clear message, never hangs. (Task 2 config.)
2. **A previous e2e run left orders/holds behind** — global setup drops and recreates `sport_e2e`, so reruns are deterministic. (Task 2 setup test: run the guest spec twice.)
3. **Deep link on a static host (`/p/x` refreshed)** — the host serves `index.html` (fallback files), and `/assets/*` keep 404s real. (Task 5.)
4. **A production build accidentally shipped with `VITE_AUTH_TEST_MODE=true`** — the bundle check fails the build. (Task 1.)
5. **Phone viewport in e2e** — the guest journey runs at 390×844 so the sticky Add to bag and checkout layout are exercised on a phone. (Task 2.)

---

### Task 1: Test sign-in only in test builds, `build:e2e`, bundle check

**Files:** Modify `src/lib/auth/createAdapter.ts`, `package.json`; Create `scripts/check-bundle.mjs`, `src/lib/auth/createAdapter.test.ts` (or extend `AuthProvider.test.tsx`).

**Interfaces — Produces:** `createAuthAdapter(env?) : AuthAdapter` unchanged signature; the test adapter is loaded through a module whose import is guarded by the literal `import.meta.env.VITE_AUTH_TEST_MODE === 'true'` so Vite removes it from normal builds. Scripts: `build` = `vite build && node scripts/check-bundle.mjs`; `build:e2e` = `VITE_AUTH_TEST_MODE=true vite build --mode e2e` (no bundle check for the marker, size check still runs with `--e2e`).

- [ ] Test: `createAuthAdapter({})` and `{VITE_AUTH_TEST_MODE:'false'}` return an adapter without `testSignIn`; `{VITE_AUTH_TEST_MODE:'true'}` has it (already pinned — keep green).
- [ ] `check-bundle.mjs`: fails (exit 1, message naming the file) when any `dist/assets/*.js` contains `test:phone-` unless `--e2e`; prints entry gzip size and fails above 120 kB.
- [ ] Verify: `npm run build` passes and `grep -l "test:phone-" dist/assets/*.js` is empty; `npm run build:e2e` contains it. Commit `build: keep the test sign-in out of production builds; bundle check`.

### Task 2: Playwright setup and the guest journey

**Files:** Create `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/helpers.ts`, `e2e/guest.spec.ts`, `.gitignore` entries; `package.json` scripts `e2e`.

**Interfaces — Produces (`e2e/helpers.ts`):** `signIn(page, phone: string): Promise<void>` (real page, code 123456); `makeRole(phone: string, role: 'staff'|'admin', branch?: string): Promise<void>` (SQL on `sport_e2e`, after the user exists); `approvePayment(request, tranId: string)`; `sql(text, params?)`.

- [ ] Config: `webServer` = backend (`npx tsx src/server.ts` in `${BACKEND_DIR:-../sport-backend}` with NODE_ENV=development, DATABASE_URL=…/sport_e2e, AUTH_TEST_MODE=true, CORS_ORIGINS=http://localhost:4173) waiting on `http://localhost:3000/health`, and `npx vite preview --port 4173` after `build:e2e`, with `/v1` proxied (preview proxy in `vite.config.ts`); `use.trace: 'off'`; project `phone` at 390×844.
- [ ] Global setup: drop + create `sport_e2e`, run backend migrate, seed and catalog import (`npx tsx src/db/migrate.ts`, `src/db/seed/run.ts`, `src/db/seed/importCatalog.ts`), set `payment_methods_enabled` aba_khqr+card+cash_on_pickup on.
- [ ] `guest.spec.ts`: home → Boots → tick a brand filter (URL has `brand=`) → open a product → choose an in-stock size → Add to bag → bag drawer → Check out → fill contact + Phnom Penh address → rider → ABA KHQR → terms → Place order → `/pay/:n` shows the KHQR image → read `tranId` from `GET /v1/orders/:n` with the page's token → `approvePayment` → page reaches `/order/:n` with "Thank you. Your order is confirmed." → `/track` with number + phone shows "Confirmed".
- [ ] Run twice (`npx playwright test e2e/guest.spec.ts --trace off`), both green. Commit `test: e2e guest checkout with KHQR`.

### Task 3: Member journey with return

**Files:** Create `e2e/member.spec.ts`.
- [ ] As guest add an item, sign in (012 …) → "We added 1 items…" message → account addresses: add an address → checkout uses it → order paid via `approvePayment` → admin (011 111 111, `makeRole` admin) marks the order `out_for_delivery` then `delivered` on `/admin/orders/:n` → member opens `/account/orders/:n` → Start a return → item, reason, size exchange or refund → "We got your return request" → `/admin/returns` shows it.
- [ ] Green twice. Commit `test: e2e member order and return`.

### Task 4: Staff counter sale and admin price change

**Files:** Create `e2e/staff.spec.ts`.
- [ ] Staff (`makeRole` staff at `sensok`) → `/admin/stock` → search SKU, press Enter → Sell → "Record sale of 1 item" → "Sale recorded"; on-hand drops by 1 after re-search.
- [ ] Admin → `/admin/products/:id` → change a size price → Save → open `/p/<slug>` in the shop → the new price shows.
- [ ] Green twice. Commit `test: e2e counter sale and price change`.

### Task 5: Static hosting fallback

**Files:** Create `public/_redirects` (`/* /index.html 200`), `vercel.json` (rewrites to `/index.html` except `/assets/`), `docs/HOSTING.md` (nginx `try_files`, Cloudflare Pages/Netlify, Vercel; API on the same site for the cookie); `scripts/sitemap.mjs` (builds `public/sitemap.xml` from `/v1/catalog/products` pages and static routes, `SITE_URL` env).
- [ ] Verify with `vite preview`: reload `/p/<slug>` and `/account` → app renders; `/assets/nope.jpg` → 404. Commit `build: SPA fallback for static hosts and sitemap script`.

### Task 6: CI

**Files:** Create `.github/workflows/ci.yml`.
- [ ] Job `checks` (Node 22): `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Job `e2e`: Postgres 16 service (postgres/postgres), checkout of `danishsary8/sport-backend` at the same branch into `sport-backend` with `secrets.BACKEND_REPO_TOKEN` (OWNER-TODO), `npm ci` both, `npx playwright install --with-deps chromium`, `npx playwright test --trace off`, upload report on failure.
- [ ] Validate YAML (`node -e` parse with the `yaml` package or `npx --yes yaml-lint`). Commit `ci: checks and e2e workflows`.

### Task 7: Performance pass

**Files:** as found (likely `src/app/routes.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts` manualChunks, image priority).
- [ ] Run Lighthouse mobile (`npx lighthouse http://localhost:4173/<path> --form-factor=mobile --only-categories=performance,accessibility,best-practices --chrome-path=/opt/pw-browsers/chromium --chrome-flags="--headless --no-sandbox" --output=json`) against a production build served by `vite preview` with the backend running; record scores in the ledger.
- [ ] Fix what keeps a page under the bars (render-blocking fonts, LCP image priority, oversized chunks); re-run and record. Commit `perf: …`.

### Task 8: Accessibility pass

**Files:** Create `e2e/a11y.spec.ts`; fixes as found.
- [ ] axe (`@axe-core/playwright`, tags wcag2a/wcag2aa) on the pages in Global Constraints; the test fails on serious/critical violations and prints them.
- [ ] Fix violations test-first (a unit test where the fix is in a component); green twice. Commit `a11y: …`.

Then the FE6 review: a fresh reviewer in its own worktree, findings re-graded, Critical/Important fixed test-first, STATUS.md updated.

# Frontend audit

Date: 2026-11-26. Spec: `docs/superpowers/specs/2026-11-26-frontend-production-design.md`.

Each spec section is listed with the evidence that it is met, or with what was found and what was done about it. "Test" means a Vitest test under `src/`; "e2e" means a Playwright test in `e2e/` that runs against the real backend.

## Measurements

Lighthouse in mobile mode, on a production build served by `vite preview` against the dev backend (simulated 4G, mid-range phone). Two runs; the second run's scores are shown.

| Page | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 89 | 100 | 100 | 3.7 s | 0 | 120 ms |
| `/c/boots` | 90 | 100 | 100 | 3.5 s | 0 | 120 ms |
| `/p/adidas-predator-25-elite-fold-over-tongue-fg` | 90 | 100 | 100 | 3.5 s | 0 | 130 ms |

Target: performance ≥ 85, accessibility and best practices ≥ 95. All three pages pass. Before this work, home scored 72–77 because the footer jumped as content loaded (CLS 0.24–0.35).

axe (WCAG 2 A and AA, `e2e/a11y.spec.ts`) finds no serious or critical problems on home, listing, product, bag, checkout, sign-in, account and admin overview.

First-load JavaScript: 146.0 kB gzipped, against a 150 kB budget enforced by `scripts/check-bundle.mjs` on every build.

Tests: 162 unit tests, 6 e2e tests (guest, member with a return, staff counter sale, admin price change, two accessibility sweeps). Backend: 724 tests.

## 1. Intent

| Job | Evidence |
|---|---|
| Find the right thing in my size, available now | Listing filters and sort in the URL (`features/catalog/listing`, test `listing.test.tsx`); sizes as a radio group with only in-stock sizes enabled (`ProductPage.tsx`); e2e `guest.spec.ts` filters by brand and picks a size |
| Pay by KHQR in under a minute, or reserve for pickup | `features/payment/PayPage.tsx` renders the real `qrString`; e2e `guest.spec.ts` pays with KHQR end to end; pickup with cash at the store is in `CheckoutPage.tsx` |
| Know where my order is | `/order/:number` and `/track` (`features/orders`); e2e `guest.spec.ts` tracks the order by number and phone |
| Members collect points | `/account/points`; the member e2e signs in and orders |

## 2. Goals, non-goals, anti-goals

| Item | Evidence |
|---|---|
| Every page reads from and writes to the API; no server state in localStorage | The only `localStorage` use is the admin health dashboard's alert thresholds (a UI preference) and the language preference. Guest order tokens are in `sessionStorage` for the tab only (`checkout/orderAccess.ts`) |
| Mobile-first and fast | Lighthouse table above |
| English and Khmer | Per-feature dictionaries, with Khmer typed against English so a missing key fails the compile; screenshots taken in both at 390 and 1366 px |
| Full shopping loop | e2e `guest.spec.ts` and `member.spec.ts` |
| Member area | `features/account` (profile, addresses, orders, returns, wishlist, points); e2e member return |
| Admin usable on a phone | Counter screen rows are stacked lists at 390 px; e2e `staff.spec.ts` runs at 390 px |
| Non-goals (gift cards, CMS, push, analytics) | None present |
| Anti-goal: no price, total or stock the server didn't send | Prices and totals come from catalog, bag and quote responses; stock is shown only as ok, low or out |
| Anti-goal: no endless spinner, no dead end | `QueryView` turns a skeleton into "Still loading… Retry" after 10 s (`ui/States.tsx`); every error state has Retry; a failed background refetch keeps the data on screen |
| Anti-goal: no fake QR, reviews or urgency | None in `src/` (searched for review, rating and viewing) |
| Anti-goal: no phone numbers or tokens in URLs | Admin order and user searches stay out of the URL; guest tokens are sent in headers or bodies, never in URLs |
| Anti-goal: Add to bag visible on mobile | Sticky bottom bar on the product page (`ProductPage.tsx`, `fixed inset-x-0 bottom-0 … lg:hidden`) |
| Anti-goal: nothing copied from Zando | Own palette, type and copy (section 6) |

## 3. Constraints

| Constraint | Evidence |
|---|---|
| React 19, Vite 8, Tailwind 4, TypeScript | `package.json` |
| Money in integer cents; availability ok, low or out | Generated types `lib/api/types.gen.ts`; `formatUsd` takes cents |
| `credentials: 'include'` on every request | `lib/api/client.ts` |
| `/v1` dev proxy | `vite.config.ts` (also used by `vite preview` for e2e) |
| Firebase phone, then Google; test sign-in for e2e | `lib/auth/`; test sign-in is compiled out of production builds and the build fails if it's present (`scripts/check-bundle.mjs`) |
| Optimised images from the manifest | `lib/images.ts`, `lib/images.manifest.json`, `<Picture>` |
| Self-hosted fonts only | `@fontsource/*` packages; no font CDN in `index.html` |

## 4. Approach

Approach A (new app shell, port the good visual pieces) was taken. `StoreContext` and the mock data are gone.

## 5. Architecture

| Item | Evidence |
|---|---|
| Folder layout | `src/app`, `src/lib/{api,auth,i18n}`, `src/features/*`, `src/ui` as specified |
| Real paths with an SPA fallback | `public/_redirects`, `vercel.json`, nginx in `docs/HOSTING.md`; deep links reload on preview |
| Filters, sort and page in the URL; `?color=` on products | `listing/params.ts`, `ProductPage.tsx` |
| TanStack Query, 30 s stale time; bag mutations write the returned bag | `app/queryClient.ts`; `cart/api.ts` (one bag change at a time, so a slower answer never overwrites a newer bag) |
| Optimistic UI only for the wishlist heart | `WishlistButton.tsx` |
| Typed fetch wrapper; `ApiError`; 401 refresh once then sign out | `lib/api/client.ts` |
| Session after sign-in; merge message from `cartMerged` | `lib/auth/AuthProvider.tsx`, `account/MergeNotice.tsx`; e2e member journey checks the merged bag |
| Google-only members are asked to add a phone | "Add your phone" card on the profile page (`account/pages/ProfilePage.tsx`) |
| i18n with `lang` on every read; EN / ខ្មែរ switch | `lib/i18n`, `shell/LangSwitch.tsx` |
| KHQR from `qrString`, USD and KHR, countdown, 3 s polling paused in the background, ABA deeplink on phones, card form, "Pay another way", expiry | `features/payment/PayPage.tsx`, `orders/api.ts` (polling stops once the order is paid, expired or cancelled) |
| `<Picture>` with AVIF/WebP, width and height, lazy except the first row | `ui/Picture.tsx`; listing passes `priority` for the first four cards |
| Per-route title, description, absolute canonical, OG image; robots; sitemap from the API; Product JSON-LD without ratings | `ui/Seo.tsx`, `public/robots.txt`, `scripts/sitemap.mjs`, `ProductPage.tsx` |
| Admin lazy, behind staff/admin; admin-only screens hidden from staff, and their queries never sent | `features/admin`; `AdminOnly` wraps the page bodies |
| States, toasts | `ui/States.tsx`, `ui/Toast.tsx` |
| Landmarks, labels, focus rings, focus trap and Escape, radio-group sizes, contrast, reduced motion | axe sweep above; `index.css` `prefers-reduced-motion`; focus rings use `outline-2 outline-offset-2 outline-obsidian` |

## 6. Visual direction

Palette tokens, Barlow Condensed for display, Plus Jakarta Sans for body, Noto Sans Khmer, sentence case, no all-caps eyebrows and no "A · B · C" strings. The header, listing grid (2/3/4 columns), product layout (sticky bar on phones, two columns on desktop) and focused checkout layout match the wireframes. Checked in screenshots at 390×844 and 1366×900, in English and Khmer; no horizontal scroll at 390 px.

## 7. Pages

All storefront and admin routes in the spec exist (`app/routes.tsx`, `features/admin`). Notes:

| Route | Finding | Action |
|---|---|---|
| `/p/:slug#print` | **Gap found.** The spec says the print studio opens at `/p/:slug#print` and `/custom` lists customisable products. The `#print` link landed at the top of the page (the product loads after the browser's own jump), and the `/custom` cards linked to the plain product page. | Fixed test-first: the studio scrolls itself into view when the hash is `#print`, and `/custom` cards link to `#print`. Checked in a real browser. |
| `/checkout/return` | **Gap found.** PayWay sends card payers back to one fixed address (`PAYWAY_CONTINUE_URL`, documented as `/checkout/return`) without the order number. The shop had no such page, so a card payer landed on "This page doesn't exist". | Fixed test-first: the pay page remembers the order for the tab before handing over to the bank, and `/checkout/return` sends the shopper to that order's pay page, which checks the payment and moves on to the confirmation. If the tab doesn't know the order, the page offers order tracking and My orders. |
| Old go-live notes | `GO_LIVE_NOTES.md` described the old demo (Stripe, `/api/...` webhooks). | Replaced with links to the real setup documents. |
| Listings | The spec asks for infinite scroll with a "Load more" fallback. The shop uses the "Load more" button only, with `page` in the URL. | Kept, and recorded in OWNER-DECISIONS: the footer stays reachable and phones on mobile data only load more when asked. |
| `/stores` | The map appears only with a Maps key (OWNER-DECISIONS); without one, each store has an "Open in Google Maps" link. | No change. |
| `/sign-in` test sign-in | The spec describes a separate "Test sign-in" form. The test build accepts code 123456 on the real phone form instead (FE4 ruling), so e2e exercises the real page. | No change. |
| `/help/*` | Help copy is written from the seeded settings. | The owner must update it when delivery fees or return rules change (OWNER-TODO). |

## 8. Testing

| Item | Evidence |
|---|---|
| Vitest and Testing Library with MSW | 162 tests, 28 files |
| Playwright e2e against the real backend: the four happy paths | `e2e/guest.spec.ts`, `e2e/member.spec.ts`, `e2e/staff.spec.ts` (counter sale and price change); plus `e2e/a11y.spec.ts` |
| Screenshots after UI tasks | Taken at 390×844 and 1366×900 in English and Khmer |
| CI: checks job and e2e job with Postgres and the backend from the same branch | `.github/workflows/ci.yml`; the backend checkout falls back to `main` when there's no branch with the same name. It needs the `BACKEND_REPO_TOKEN` secret if the backend repository is private (OWNER-TODO). |

## Open items (known, accepted)

These are recorded in `sport-backend/docs/superpowers/STATUS.md` under deferred minors:

- canonical URLs use the serving host, not a configured site URL
- admin searches reset when staff press Back from a result
- the bundle check finds the test sign-in by its token prefix
- profile sizes can't be cleared; returns approve/reject have no confirmation step; the sheet focus trap only wraps at the ends
- the legacy health dashboard keeps Title Case labels

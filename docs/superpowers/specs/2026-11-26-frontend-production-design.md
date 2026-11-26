# Sport Castle Storefront — Production Design

Date: 2026-11-26 · Repo: `sport-heaven` · Status: approved by the builder on the owner's standing instruction (the owner opted out of questions; every call below is recorded in `sport-backend/docs/superpowers/OWNER-DECISIONS.md`).

Inputs:
- the work order (`sport-backend/docs/superpowers/plans/2026-11-25-overnight-handoff.md` Stage 5);
- the backend API (`sport-backend/README.md`, `sport-backend/docs/api/openapi.json`);
- the Zando behaviour reference (`docs/research/zando-behavior-reference.md`);
- the original design notes (`docs/frontend-re-blueprint/01–04`).

## 1. Intent

Sport Castle sells football boots, club and national kits, and F1 teamwear from three Phnom Penh stores. Most customers are young players and fans on Android phones who pay with the ABA app. The shop's job online is narrow:

1. **Find the right thing in my size, available now.**
2. **Pay by KHQR in under a minute,** or reserve it for pickup at a store.
3. **Know where my order is.**

Members also collect points and get their tier perks.

Today's storefront is a demo built in AI Studio. Its products, stock, prices, bag, orders and accounts live in mock files and the browser's storage. Its QR is fake, and it shows invented reviews, invented "price drop" alerts and invented social proof. The production storefront runs **entirely on the new API**. It keeps the brand, and is honest about everything it shows.

## 2. Goals, non-goals, anti-goals

**Goals**
- Every page reads from and writes to `sport-backend`. There is no mock data and no server state in localStorage.
- Mobile-first (390 px) and fast on a mid-range Android over 4G: Lighthouse mobile ≥ 85 for performance and ≥ 95 for accessibility and best practices on home, listing and product.
- English and Khmer.
- The full shopping loop: browse, filter, product, size, print, bag, checkout, KHQR or card, confirmation, tracking.
- The member area: profile, phone, addresses, orders, returns, wishlist, loyalty.
- An admin area for staff and admins, usable on a phone at the counter.

**Non-goals**
- Gift cards, point redemption and multi-currency (spec non-goals).
- A CMS.
- Push notifications.
- Analytics: none until the owner chooses (OWNER-TODO).

**Anti-goals** (failure even if it works)
- A price, total or stock number the server didn't send.
- A spinner or skeleton that never ends; a dead end without Retry.
- A fake QR, fake reviews, fake urgency ("12 people are viewing this").
- Phone numbers or order tokens in URLs, analytics or logs.
- Add to bag hidden below the fold on mobile.
- Anything copied from Zando's brand, copy or images.

## 3. Constraints

- **Stack:** React 19, Vite 8, Tailwind 4 and TypeScript, as the repo has today.
- **Backend contract:** `sport-backend/docs/api/openapi.json`. Money is integer cents. Availability is `ok | low (1–3, with count) | out`. Guests have a bag via the httpOnly `sc_cart` cookie, so every request uses `credentials: 'include'`.
- **Dev:** a Vite proxy forwards `/v1` to `http://localhost:3000`, so the cookie is same-site. In production the API lives on a sibling subdomain (DEPLOYMENT.md).
- **Auth:** Firebase web SDK, phone OTP with invisible reCAPTCHA first, Google second. For end-to-end tests, `AUTH_TEST_MODE` test tokens via a dev-only "test sign-in" adapter.
- **Images:** the API returns `/assets/catalog/<name>.jpg`. Optimised `-480/-960/-1440` WebP/AVIF siblings exist only where the source was wide enough (`docs/images.md`).
- **No network access to new font CDNs at runtime:** fonts are self-hosted from `@fontsource` packages.

## 4. Approaches considered

| Approach | What it means | Trade-off | Verdict |
|---|---|---|---|
| **A. New app shell in the same repo, porting the good visual pieces** | Replace `src/` with a feature-folder app (router, query, i18n, API client). Port and rewrite the presentational components worth keeping (product card, jersey preview SVG, navbar look, footer, policy copy). Delete the rest. | The most work up front; no legacy business logic left anywhere. | **Chosen.** The old pages are wired to `StoreContext` (1,918 lines of local business logic) and mock data. Refactoring each page in place would mean untangling that logic page by page while keeping it working, which costs more than rewriting against a typed API. |
| B. Refactor the existing pages in place | Keep the pages; swap their data sources one by one. | A smaller first diff, but every page keeps hidden coupling to StoreContext and mock types; long tail of half-migrated states. | Rejected. |
| C. Move to a server-rendered framework (Next.js/Remix) | Better SEO by default. | Out of scope (work order: keep React + Vite); needs a Node host, while static hosting is the owner's simplest deploy. | Rejected. Per-route meta plus a generated sitemap cover the SEO the shop needs now. |

## 5. Architecture (builder's calls, recorded)

```
src/
  main.tsx                    providers: QueryClient, Router, I18n, Auth, Toasts
  app/routes.tsx              route table (lazy pages), layouts, 404
  app/layouts/                StoreLayout (header, footer, bag drawer), CheckoutLayout (focused), AdminLayout
  lib/api/                    client.ts (fetch wrapper), types.gen.ts (from openapi.json), errors.ts, endpoints per area
  lib/auth/                   firebase.ts, AuthProvider (token, 401 refresh-once-then-sign-out), testAuth.ts (dev only)
  lib/i18n/                   I18nProvider, en.ts, km.ts, useT(), formatters (USD/KHR, dates in Asia/Phnom_Penh)
  lib/images.ts               srcset from /assets/catalog/<name>.jpg using the generated width manifest
  lib/seo.tsx                 <Seo title description canonical image/> using React 19 hoisted <title>/<meta>
  features/catalog/           home, listing, filters, product, print studio, search, Q&A, wishlist
  features/cart/              bag drawer, bag page
  features/checkout/          checkout page, payment (KHQR / card), confirmation
  features/orders/            tracking, my orders, order detail
  features/account/           auth pages, profile, addresses, returns, loyalty
  features/admin/             overview, orders, stock, products, pricing, users, Q&A, returns, system health (lazy)
  features/pages/             branches, about, policies, size guide, 404 (static copy kept from the old site)
  ui/                         design-system primitives (Button, Field, Select, Sheet/Drawer, Dialog, Toast, Skeleton, ErrorState, EmptyState, Price, Availability, Picture)
```

- **Routing: React Router 7** (declarative routes with lazy pages):
  - real paths with an SPA fallback (`vite preview` and any static host; DEPLOYMENT notes for the owner);
  - filter state, sort and page in the URL query;
  - colour as `?color=` on product URLs (Zando "Adapt").
- **Server data: TanStack Query 5.** Every API read is a query with a 30 s stale time; catalog lists keep the previous data while refetching. Mutations update the bag/order caches from the response the API returns (every bag mutation returns the full bag). Optimistic UI only for the wishlist heart.
- **API client:**
  - `openapi-typescript` generates `types.gen.ts` from a committed copy of `openapi.json` (`npm run api:types` copies it from `../sport-backend/docs/api/openapi.json` when present);
  - a thin typed `fetch` wrapper sets `credentials: 'include'`, `Accept-Language`/`lang`, the bearer token, and maps `{error:{code,message,details}}` to an `ApiError`;
  - on 401 it refreshes the Firebase token once and retries, then signs out.
- **Auth:**
  - Firebase phone sign-in with invisible reCAPTCHA (+855 preselected, any country allowed), then Google;
  - `POST /v1/auth/session` after every sign-in; the "your bag was combined" message comes from `cartMerged`;
  - Google-only members see "Add your phone to earn points", using `linkWithPhoneNumber`;
  - with `VITE_AUTH_TEST_MODE=true` (dev and e2e only), the sign-in page shows a "Test sign-in" form that mints `test:` tokens (the backend accepts them only under `AUTH_TEST_MODE`).
- **i18n:**
  - `en` and `km` dictionaries with a tiny `useT()` (no runtime library);
  - the language comes from the URL-independent preference in localStorage (a UI preference, allowed), else the browser;
  - `lang` is passed to every API read, and the header has an EN / ខ្មែរ switch;
  - Khmer font: Noto Sans Khmer, self-hosted;
  - copy is short, plain and sentence case.
- **Payments UI:**
  - KHQR is rendered from `qrString` with the `qrcode` package as an SVG, with the amount in USD and KHR, the order number and a countdown to `reservedUntil`;
  - the page polls `/payment-status` every 3 s while visible (paused when the tab is hidden);
  - the ABA deeplink button shows on phones;
  - card payments auto-submit the PayWay form (`redirect` instructions) in the same tab;
  - "Pay another way" calls `/payments`;
  - when the hold expires, the page says so and offers "Back to bag".
- **Images:** a `<Picture>` component builds AVIF and WebP `srcset`s from the manifest of widths that exist, falls back to the JPG, and sets explicit `width`/`height` (3:4) plus `loading="lazy"` except for the first row.
- **SEO:**
  - per-route `<title>`, description, canonical, and Open Graph image (product photo);
  - `robots.txt`;
  - `scripts/sitemap.mjs` builds `public/sitemap.xml` from the API at deploy time;
  - product pages include JSON-LD `Product` with price and availability (no ratings).
- **Admin:** lazy-loaded under `/admin`, behind `role in (staff, admin)`. Admin-only screens are hidden from staff. Recharts is used only for system health.
- **States:**
  - every data view has loading (a skeleton with a 10 s timeout that turns into "Still loading… Retry"), empty and error states (the message plus a Retry button);
  - toasts confirm actions ("Added to bag", "Address saved");
  - no toasts for anything the user didn't do.
- **Accessibility:**
  - semantic landmarks, labelled fields and visible focus rings (2 px obsidian with a 2 px offset);
  - drawers and dialogs trap focus and close on Escape;
  - size buttons are a radio group;
  - colour contrast AA, and `prefers-reduced-motion` respected.

## 6. Visual direction

**Subject, audience, job:** a Phnom Penh football shop for players and fans on phones; the job is "the right size, available now, paid in a minute".

**Palette** (the brand's own, kept and given roles):
| Token | Hex | Role |
|---|---|---|
| paper | `#FDFCF9` | page background |
| stone | `#EAE7DF` | the product photo stage (3:4), skeletons, quiet fills |
| obsidian | `#0E1113` | text, primary buttons, the header bar on scroll |
| graphite | `#5A5D57` | secondary text (≥ 4.5:1 on paper) |
| vermilion | `#C8232C` | buying: Add to bag, Pay, sale prices, "Only 2 left" |
| cobalt | `#032EA1` | stores and payment information: pickup, KHQR panel, tracking timeline |
| brass | `#B8933B` | loyalty only (tier, points) |

Vermilion and cobalt are the colours of the Cambodian flag. Using them as the two signal colours (buy vs. store/payment information) is the deliberate local choice. Nothing else is coloured.

**Type:**
- **Barlow Condensed 700/800** for headlines, prices and sizes. It is set tight, like a shirt nameset: this is the shop's one bold move. The home hero headline and the print studio preview use it at poster scale; everywhere else it is restrained (product names stay in the body face).
- **Plus Jakarta Sans 400/500/600** for body and UI, at 16 px base and 1.55 line height.
- **Noto Sans Khmer** for Khmer, with 1.7 line height (Khmer stacks need room).
- The previous Instrument Serif italic and the JetBrains Mono labels are dropped: they were decoration. Prices use Plus Jakarta tabular figures.
- No all-caps eyebrow labels and no "A · B · C" meta strings; metadata is a plain sentence ("Real Madrid, home kit 2026/27").

**Layout:**
- Left-aligned and mobile-first.
- **Header:** wordmark left; search, account and bag right; language switch in the menu. It condenses to one 56 px bar on scroll.
- **Listing:** 2 columns on mobile, 3 on tablet, 4 on desktop, all 3:4 photos. A filter bar sits under the title: *Filter* (a sheet with Apply/Clear) plus quick chips for size and sort.
- **Product:**
  - phone: the photo carousel first, then name/price/sizes and a sticky bottom bar (price + Add to bag);
  - desktop: a two-column layout (gallery left, buy box right).
- **Checkout:** a single column on phone and two columns on desktop (form + order summary). No header navigation, only the logo and "Back to bag".

```
Phone product page                 Desktop listing
┌──────────────────────────┐      ┌──────────────────────────────────────────────┐
│ ≡  SPORT CASTLE    ⌕ ♙ 👜2│      │ SPORT CASTLE   Boots Kits F1 Balls   ⌕ ♙ 👜 │
├──────────────────────────┤      ├──────────────────────────────────────────────┤
│ [ photo 3:4  ◦ ◦ ◦ ]      │      │ Boots   152 items                            │
│ Adidas                    │      │ [Filter] [Size ▾] [Sort: Popular ▾]          │
│ F50 Elite FG        $270  │      │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│ Size  ○39 ○40 ●41 ⊘42     │      │ │3:4 │ │3:4 │ │3:4 │ │3:4 │                  │
│ Only 2 left in 41         │      │ └────┘ └────┘ └────┘ └────┘                  │
│ Print name & number  ›    │      │ Brand   Brand   Brand   Brand                │
│ Size guide · Delivery     │      │ Name    Name    Name    Name                 │
├──────────────────────────┤      │ $95     $86 $98 $270    $35                  │
│ $270      [ Add to bag ]  │      └──────────────────────────────────────────────┘
└──────────────────────────┘
```

**Motion:**
- one orchestrated moment: the print studio, where the name and number "press" onto the shirt preview as you type;
- otherwise, drawers slide in and the bag count updates;
- no scroll-triggered fades, and everything is disabled under reduced motion.

**Copy:** plain and specific, from the shopper's side: "Add to bag", "Only 2 left", "Pay with ABA KHQR", "We're holding your items until 14:32". Errors say what happened and what to do; they never apologise.

## 7. Pages

**Storefront**

| Route | Content | API |
|---|---|---|
| `/` | Home sections from the API (hero, product rails, category grid, brand row), store strip (3 branches, pickup) | `/catalog/home`, `/branches` |
| `/c/:category`, `/collections/:slug`, `/brands/:slug`, `/shop` | Listing: URL-synced filters (sheet with Apply/Clear on mobile; sidebar on desktop), sort, infinite scroll with a "Load more" fallback, and `page` in the URL so Back returns to the same place | `/catalog/products`, `/catalog/filters`, `/catalog/collections/:slug`, `/catalog/menu` |
| `/search?q=` | Results (listing) + suggestions overlay from the header (250 ms debounce, min 2 characters, stale requests cancelled, popular searches = categories/brands from the menu, a "No results — try…" state) | `/search`, `/search/suggest` |
| `/p/:slug` (+ `?color=`) | Product page: gallery by colour; sizes as a radio group where only in-stock sizes are enabled and out-of-stock sizes are shown crossed out; "Only N left"; Add to bag disabled until a size is chosen; sticky mobile bar; size guide sheet; print studio for customisable products (name 1–14, number 1–99, patch, font, with the fee from the server via the bag); availability per store; related products; Q&A (published + ask form) | `/catalog/products/:slug`, `/cart/items`, `/questions` |
| bag drawer + `/bag` | Lines with in-place size and quantity edits; problems shown (unavailable, more than available); promo field with the server's message; delivery estimate (province picker → quote); "Items in your bag aren't held until you check out"; Checkout | `/cart`, `/checkout/quote` |
| `/checkout` | Contact (name, phone, email optional, channel: phone / Telegram / WhatsApp); delivery (saved addresses or Province → District → Commune + street) or pickup store; delivery options with fees; payment method; promo; note; terms; Place order (Idempotency-Key per attempt) | `/checkout/quote`, `/orders`, geo, `/me/addresses` |
| `/pay/:number` | KHQR / card / switch method / countdown / polling; the success state moves to confirmation | `/orders/:number`, `/payment-status`, `/payments` |
| `/order/:number` | Confirmation and order detail (timeline, items, totals, address); a guest's order token is kept in sessionStorage for this tab only, then tracking is by number + phone | `/orders/:number` |
| `/track` | Track by order number + phone (masked result) | `/orders/track` |
| `/sign-in` | Phone OTP first, Google second, the guest-bag merge message, "Continue as guest" from checkout | Firebase, `/auth/session` |
| `/account` (+ `/profile`, `/addresses`, `/orders`, `/orders/:number`, `/returns`, `/returns/new?order=`, `/wishlist`, `/points`) | Member area | `/me*` |
| `/stores` | Three branches: hours, phone, Telegram, map only if `VITE_GOOGLE_MAPS_API_KEY` is set, otherwise a list with "Open in Google Maps" links | `/branches` |
| `/help/*` | Delivery, returns, size guide, contact, about, terms, privacy (the old site's copy, corrected to match real behaviour; flagged for the owner's legal review) | static |
| `*` | 404 with search and links home | — |

**Admin** (lazy; `/admin`)

| Route | Who | Content |
|---|---|---|
| `/admin` | staff, admin | Overview numbers with links |
| `/admin/orders`, `/admin/orders/:number` | staff, admin | List/filter/search; detail with timeline, payments, pick list per store, status buttons allowed by the machine, cancel, cash at the counter, refunded, notes |
| `/admin/stock` | staff, admin | The counter screen: search SKU/name (barcode-scanner friendly: the input auto-submits on Enter), sizes with on-hand at my store, sell, adjust, transfer, movement history |
| `/admin/products`, `/admin/products/:id`, `/admin/products/new` | admin | List, edit, variants and prices, status, CSV export/import with preview |
| `/admin/promotions`, `/admin/delivery`, `/admin/settings` | admin | Promo codes, delivery rates, pricing settings, payment methods |
| `/admin/users` | admin | Find users, set role and store, adjust points |
| `/admin/questions`, `/admin/returns` | staff, admin | Moderation; return decisions |
| `/admin/health`, `/admin/logs` | admin | System health (the moved SystemHealthDashboard + charts), webhook/notification logs, test message |

Dropped from the old site, with reasons (recorded):
- **gift cards:** a spec non-goal;
- **lookbook/journal:** invented editorial with AI images (the owner can add real stories later);
- **boot finder quiz:** replaced by the surface filter and size guide;
- **cookie banner:** nothing is tracked;
- **fake review and urgency widgets.**

The custom studio route becomes `/p/:slug#print`, and `/custom` lists the customisable products.

## 8. Testing

- **Vitest + Testing Library:** components and hooks with API responses mocked by MSW, built from the generated types. The old `commerce.test.ts` is already deleted (its logic is server-side).
- **Playwright e2e** against a real local backend (`AUTH_TEST_MODE=true`, the fake payment provider, the seeded DB). Happy paths:
  1. browse → filter → product → add → bag → checkout as a guest with KHQR → approve via the dev route → confirmation → track;
  2. member test sign-in → guest bag merged → address → order → mark delivered (admin) → return request;
  3. staff counter sale;
  4. an admin price change visible in the shop.
- **Screens:** after every UI task, screenshots at 390×844 and 1366×900, reviewed before committing.
- **CI:** typecheck, lint, unit and build in GitHub Actions. The e2e suite runs locally and in CI with a Postgres service and the backend checked out from the same branch (a second job; documented).

## 9. Left to the builder

Component internals; exact copy (within the voice above); the skeleton shapes; how the infinite scroll observes the sentinel; MSW handler organisation; which old presentational components are worth porting versus rewriting; the plan split (expected: foundation & API layer → browse → bag/checkout/payment → account → admin → e2e/perf/a11y hardening).

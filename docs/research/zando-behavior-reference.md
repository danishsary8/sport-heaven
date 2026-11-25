# Zando (zandoshops.com) — Behavior Reference for Sport Castle

Studied 2026-11-25 with a headless browser (desktop 1366px + iPhone 390px), guest session, Cambodia / USD / English.
Nothing was submitted: no registration, no OTP, no order. One item was added to an anonymous guest bag to observe cart behavior.

Purpose: learn **how** a mature Cambodian e-commerce site behaves, then decide what Sport Castle should adopt, adapt, or avoid.
We copy behaviors and patterns only — never Zando's branding, copy, images, or data.

---

## 1. Architecture at a glance

| Layer | What Zando does |
|---|---|
| Frontend | Next.js App Router, server-rendered pages (RSC), client navigation with prefetch |
| API style | Next.js `/api/*` routes acting as a thin proxy (BFF) in front of an OpenCart-style commerce backend. Almost every call is `POST` with a JSON body, even reads |
| Images | DigitalOcean Spaces CDN (`…sgp1.cdn.digitaloceanspaces.com/catalog/...`), relative paths in API + one `image_url` base returned by the API |
| Session | Plain (non-httpOnly) cookies: `country_id`, `country_code`, `currency_id`, `language_id`, `language_code`, `gender_code`, `player_id` (anonymous device id) |
| Bot protection | Google reCAPTCHA Enterprise loaded site-wide, token required on checkout |
| Payments | ABA PayWay checkout script (`checkout.payway.com.kh/plugins/checkout2-0.js`) |
| Push | OneSignal web push |
| Analytics | GTM + GA4 + Meta Pixel; add-to-cart sends a GA4 `items[]` payload alongside the cart call |

**URL scheme:** `/{country}/{lang}/{department}/…`, e.g.
- Listing: `/kh/en-gb/women/clothes/women-shoes?page=1&sub_manufacturer_id=89&sort_by=5`
- Product: `/kh/en-gb/women/performance-running-sneakers-5262508047` (slug + model number)
- Checkout: `/kh/en-gb/women/proceed-to-checkout` → `/kh/en-gb/women/checkout`
- Search: `/kh/en-gb/women/clothes/text?query=nike`

---

## 2. Flow-by-flow behavior

### 2.1 First visit — country & language gate
- `/` → 307 redirect to `/select-country`.
- Form: Country (custom combobox), Language (English / ខ្មែរ / 中文), **required** Terms checkbox, Continue.
- Validation is inline ("Country is required") — not an alert.
- On submit: writes locale cookies, then routes to the default department home (`/kh/en-gb/women`).
- `POST /api/home/select-country` returns countries + currency formatting rules (`symbol_left`, `decimal_place`), languages, and the full **phone prefix list** (reused later by phone inputs).

### 2.2 Home page — fully CMS-driven
- `POST /api/home/get-home` returns, per department, an ordered list of **modules**. Each has `module_code`, `name`, `settings`, padding. Observed codes:
  - `home_slide` — hero / collection carousel; separate `image_web` (1920×550) and `image_app` (860×759); button `{titles{lang}, button_link{screen, seo_url, id}}`, optional countdown.
  - `category_feature` — icon/brand rows, `item_per_row_web` vs `item_per_row_app`.
  - `product_feature` — product carousel: `template_data` (product ids), `items_shown_carousel {website:4, mobile_app:2}`, `limit`, `min_stock`, "SEE MORE" button → listing.
- All titles are multi-language maps: `{"1": "SHOP NOW", "2": "ទិញឥឡូវនេះ", "3": "立即选购"}`.
- The same config drives the web site **and** the mobile app (`screen: "ProductListScreen"`).
- Announcement bar ("featured block") from `/api/home/footer`: rotating promo-code messages every 6 s.
- Skeleton blocks render first, then content.

### 2.3 Navigation
- Top tabs = departments (WOMEN / MEN / BEAUTY / KIDS / LIFESTYLE). Second row = mega-menu (Shop by Brand, New In, Clothing, Accessories, Shoes, Shop by Collection, Sale in red).
- Whole tree comes from `POST /api/home/menu` (category id, name, seo_url, image, `is_brand`, `is_sale_category`, nested `childs`).
- Header icons: country flag, search box, account, notifications bell, bag.
- Mobile: hamburger + logo + icons; announcement bar wraps to 3 lines (takes ~80px).

### 2.4 Product listing (PLP)
- Header: title + item count ("Shoes — 152 Items").
- Filter chips row: **Filter** (opens right drawer) + quick dropdowns Brand / Price / Size / Color; "Sort by: Recommend".
- **Filters are server-defined**: `POST /api/list-product/get-filter {seo_url}` returns a typed list the UI renders generically:
  - `radio/list` sort (Recommend, New, Discount high/low, Price high/low)
  - `checkbox/grid` brand, size (sizes sorted numerically, e.g. 35, 35.5, 36…)
  - `range` price with min/max/step **plus suggested buckets** ($0–25, $25–50…)
  - `radio/grid` discount bands (Up to 30%, 30–50%, 50–70%, Over 70%)
- Filter drawer: tabs per facet, "No filter applied" summary, **Clear** + **APPLY** (filters are batched, not live).
- Applied state lives in the **URL query** (`?sub_manufacturer_id=89&sort_by=5`) → shareable, back-button safe.
- Data: `POST /api/list-product/get-product/by-category {page, seo_url, ...filters}`; **infinite scroll**, next page requested on scroll.
- Card: image + hover second image, brand, name, price / sale price with strike-through, discount badge (`-30%`), server-styled label pill ("🌟 New In", colors from API), heart (wishlist), color dots.

### 2.5 Product detail (PDP)
- Left: vertical thumbnail strip + main carousel with arrows. Right: breadcrumb, brand, name, price (`$20.3 -50% $40.59`), "2 Colors available" with **photo swatches** (each color is its own product URL), sizes.
- **Only in-stock sizes are shown** for the chosen color.
- Size label switches from "Please select one size" → "Size: 37".
- **Add to bag is disabled until a size is chosen**; shows a spinner while the request is in flight.
- Trust row: "Global Shipping", "14-Day Return Policy". Collapsible Description with product code.
- "Similar Items" carousel (`/api/product/product-detail-similar`, paged).
- Mobile: image first, thumbnails become a horizontal strip; Add to bag is below the fold.

### 2.6 Add to bag (the important one)
```
POST /api/cart/add
{ "product_id": 33193, "option": "{\"32713\":\"252104\"}", "quantity": 1, "tag": {…analytics only…} }
→ { "isInStock": false, "message": "There is only 1 available in stock!", "total_cart": 1, ... }
```
- Client sends **only ids + quantity**. Price is never trusted from the client.
- Server checks stock and returns a human message when the request exceeds it.
- Guest carts are stored **server-side**, keyed by the anonymous device cookie — the bag survives reloads.

### 2.7 Bag drawer
- Right-side drawer with tabs **BAG (n) | WISHLIST (n)**.
- Line: image, brand, name, code + color, **size dropdown and quantity dropdown editable in place**, "1 Left in stock" in red, "Move to wishlist", delete icon, original / discount / final price.
- Footer: collapsible "Amount to pay $20.3", breakdown (Total, Save), Checkout button.
- `POST /api/cart/list` returns **totals already computed by the server** as labelled lines:
  `totals.content = [{title:"Total", value:40.59}, {title:"Save", value:-20.29}]`, `totals.total = {title:"Amount to pay", value:20.3}` — the UI just prints them.
- Also returns `config_checkout_guest: "1"`, `feature_checkout.status`, points info.

### 2.8 Checkout gate (`/proceed-to-checkout`)
- Two columns: **Guest Checkout** (explains guests can still track the order, but miss a $5 welcome code + loyalty points) vs **Login / Register** tabs.
- Login = **mobile phone (+855 prefix picker) + password**, "Forgot your password?", **Google** sign-in.
- Membership is tied to the phone number — the same number links the online account with in-store membership.

### 2.9 One-page checkout (`/checkout`)
Left column:
- **Shipping Address** → drawer → "Add address": first name, last name, phone (+855), **Province → District → Commune** cascading selects (`/api/auth/register/get-city`, `get-district-by-zone-id`), street.
- **Shipping Method** card with carrier logo: "Virak Buntham | $1 — 2–3 days" or "Standard Shipping — 1–3 days" (quotes depend on zone), **Change**.
- **My shopping bag** with an honest note: *"items in your bag are not reserved — check out now to make them yours."*

Right column:
- **Payment Method** (logos + one-line descriptions): ABA KHQR, Credit/Debit Card, ACLEDA Pay, Wing Bank, Alipay, WeChat.
- **Preferred contact line**: phone + radio **Phone call / Telegram / WhatsApp**.
- **Promo code** with Apply + "Promo Code" link to available codes.
- **Note** textarea.
- Black summary box: Total, Save, Delivery fee (carrier), **Amount to pay**.
- **Proceed to checkout** (reCAPTCHA token attached).
- Every change re-calls `POST /api/checkout/confirm-checkout` and the server returns the fresh totals + methods.

### 2.10 Search
- Focus opens a panel with CMS-driven **"Popular search items"** and **"Shop by Category"** chips.
- Typing calls `get-suggestion` **on every keystroke** with no debounce (`n`, `ni`, `nik`, `nike`) — all returned **HTTP 500** during the test.
- Enter → `/clothes/text?query=nike`; the search-filter call also returned 500 and the page **stayed on skeletons forever** with no error or retry.

### 2.11 Account, loyalty, support
- Account area: My Shop, Order history, Settings, Notification, Membership & Benefits.
- Tiers by **spend per bill**: Online (free) → Silver $50 → Gold $100 → Platinum $200, with % discounts per product type. Points: 1 point per $10 (online + in-store), 1 point = $0.15 voucher, expire without one purchase a year.
- Notifications bell with an empty state that has CTAs ("Shop women / Shop men").
- Store locator: brand filter tabs + map + list.
- Returns: 14 days, unworn / tags on; hygiene exclusions (socks, underwear, swimwear…); damaged items reported within 1 day with photos; refunds within 14 business days to the original method.
- Footer: Smart + Cellcard hotlines, email, **Telegram support**, app download, payment logos.

---

## 3. What Sport Castle should take

### Adopt (high value, fits our project directly)
| # | Behavior | Why for us | Where it lands |
|---|---|---|---|
| A1 | **Client sends ids + qty only; server prices everything** and returns labelled totals lines | Fixes our biggest security hole (we trust client prices today) | `sport-backend`: `POST /cart/items`, `GET /cart` returns `totals.lines[] + total` |
| A2 | **Server-side guest cart** keyed by an anonymous id cookie, merged into the account on login | Bag survives reloads/devices; one source of truth | `carts`, `cart_items` tables; httpOnly `cart_id` cookie |
| A3 | Stock-aware add-to-cart with a friendly message ("Only 1 left") and "N left in stock" on lines | Prevents overselling, builds urgency honestly | `variants.stock`, check on add + re-check in order transaction |
| A4 | **Phone number (+855) as the primary identity**, plus Google | How Cambodians actually shop; links online + in-store members | Firebase Auth phone (SMS OTP) + Google; `users.phone` unique in Postgres |
| A5 | **Guest checkout** with a clear "join to get X" incentive | Keeps conversion high while still growing members | Gate page before checkout |
| A6 | **Province → District → Commune** cascading address | Real Cambodian addresses; enables zone-based delivery fees | `geo_provinces/districts/communes` seed + `/geo/*` endpoints |
| A7 | Delivery **carrier options with zone quotes** (in-house rider vs Virak Buntham-type provincial courier) and **store pickup** | Phnom Penh same-day vs provinces 2–3 days | `shipping_methods` + quote endpoint |
| A8 | **Preferred contact line: Phone / Telegram / WhatsApp** | Ops actually confirm orders on Telegram; we already notify via Telegram | `orders.contact_channel` |
| A9 | Local payments list: **ABA KHQR first**, card, ACLEDA, Wing | Matches market; KHQR via PayWay replaces our fake QR | PayWay integration + webhook (already scaffolded) |
| A10 | **Server-defined filters** (typed facets incl. price buckets) + filter state **in the URL** + Apply/Clear drawer | Shareable/SEO-friendly; frontend renders any facet | `GET /catalog/filters?collection=`; frontend reads/writes query |
| A11 | Size buttons show **only available sizes**, Add-to-bag **disabled until size**, inline label "Size: 42" | Removes the #1 PDP error | Frontend PDP |
| A12 | Bag drawer with **in-place size/qty edit**, Move to wishlist, Bag/Wishlist tabs | Fewer page hops | Frontend CartDrawer |
| A13 | Honest **"not reserved"** note in bag/checkout | Sets expectations; no fake holds | Copy |
| A14 | Loyalty **tiers + points** with plain-language rules | We already have LoyaltyTierProgress UI — give it a real backend | `loyalty_ledger` table, earn on paid orders |
| A15 | **Multi-language content maps** (`{en, km, zh}`) for CMS/banners | Khmer support without code changes | `jsonb` translations in content tables |

### Adapt (good idea, different shape for us)
- **CMS-driven home modules** → start with a small typed `home_sections` table (hero, product rail, category grid). No page builder yet.
- **Country gate** → don't block first visit. We only sell in Cambodia: default to KH/USD and use a small language switcher (EN/ខ្មែរ) in the header.
- **reCAPTCHA Enterprise everywhere** → we already use Firebase; use **App Check / Turnstile only on auth, OTP and order creation**.
- **Infinite scroll** → keep it, but with a "Load more" fallback and page numbers in the URL so Back returns to the same place.
- **Each color = separate product URL** → keep one product with color variants, but give each color a URL param (`?color=black`) for sharing and SEO.

### Avoid (Zando's mistakes)
- ❌ **POST for every read** — breaks HTTP and CDN caching. Use `GET` for catalog/filters/menus with `Cache-Control`.
- ❌ **Search suggestions on every keystroke** with no debounce, and 500s with no fallback → debounce 250 ms, cancel stale requests, minimum 2 characters, show "No results / try again".
- ❌ **Infinite skeletons on error** → every data view needs loading / empty / error (with Retry) states.
- ❌ **Exact stock counts in listing APIs** (`"quantity": 370`) → expose `in_stock` + "low stock" only (exact count only when ≤ 3).
- ❌ **Non-httpOnly cookies for session-like state** → session and cart cookies must be httpOnly + Secure + SameSite=Lax.
- ❌ **Phone + password login** → use SMS OTP (no passwords to leak or reset).
- ❌ Three-line announcement bar on mobile → one line, swipeable.
- ❌ Add to bag below the fold on mobile → **sticky bottom Add-to-bag bar** on mobile PDP.
- ❌ Heavy third-party tag load (GTM + GA + Pixel + OneSignal + reCAPTCHA on every page) → load analytics after consent, push only after opt-in.

---

## 4. Backend contract this implies for `sport-backend`

Sketch only — the final shape gets settled in the backend design doc.

```
Auth (Firebase ID token in Authorization: Bearer)
  POST /auth/session            → upsert user from token (phone/google), merge guest cart
  GET  /me                      → profile, tier, points

Catalog (GET, cacheable)
  GET  /catalog/menu
  GET  /catalog/products?collection=&brand=&size=&price_min=&price_max=&sort=&page=
  GET  /catalog/filters?collection=
  GET  /catalog/products/:slug  → variants [{id, color, size, in_stock, low_stock}]
  GET  /search/suggest?q=        (debounced client, min 2 chars)

Cart (anonymous httpOnly cart cookie OR user)
  GET    /cart                  → lines + server totals {lines:[{label,amount}], total}
  POST   /cart/items            {variantId, qty}      → 409 + message if insufficient stock
  PATCH  /cart/items/:id        {qty | variantId}
  DELETE /cart/items/:id
  POST   /cart/promo            {code}

Checkout
  GET  /geo/provinces | /geo/districts?province= | /geo/communes?district=
  POST /checkout/quote          {address, shippingMethod, promo} → totals + available methods
  POST /orders                  {address, shippingMethod, paymentMethod, contactChannel, note}
                                  → server recomputes everything, decrements stock in one transaction,
                                    status = pending_payment, returns PayWay KHQR payload
  POST /webhooks/payments/aba   → marks paid, sends Telegram + email, awards points
  POST /orders/track            {orderId, phone}
```

---

## 5. Answer to the open auth question

Zando confirms our earlier recommendation, **Option A: keep Firebase Auth**, with one change: make **phone number (SMS OTP)** the main sign-in, keep Google as the second option, and allow guest checkout. Firebase supports phone auth natively, so the backend only verifies Firebase ID tokens and keys members by phone in Postgres.

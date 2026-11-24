# Sport Castle: text for your portfolio's project section

Copy what you need. Nothing here changes the app.

## Card (short)

**Title:** Sport Castle
**One line:** A football and F1 kit store where every jersey turns to show its back, with filters you can share as a link.
**Tags:** React · TypeScript · Vite · Tailwind CSS · Express · PostgreSQL

## Card image

Use `docs/screenshots/home-hero.webp` (1600 px wide). For a square crop, `docs/screenshots/mobile.webp` also works.

## Project page (longer)

Sport Castle is an online store for football kits, boots and F1 team wear, set in Phnom Penh. I built it to practise designing a real shopping flow end to end: how people find their team's shirt, compare versions and check out.

**What I focused on**

- **A filter engine built for football.** Team, league, season, kit type, Fan or Player version, fit and sleeve, with live counts. One set of definitions drives the sidebar, the mobile sheet, the menus and the URL, so a filtered view can be shared as a link.
- **Front and back of every kit.** The home page turns each jersey to show the back; product cards flip on hover or swipe.
- **Honest product data.** Supplier, sponsor and fabric are stored with a confidence level, and anything unconfirmed is hidden from shoppers.
- **An image pipeline.** One command converts photos to WebP and links them to products.
- **Accessibility and speed.** Keyboard support, visible focus, reduced-motion support, and pages that load on demand (first download cut from 2.3 MB to 758 kB).

**Backend (API work)**

The repository also contains the Express API I designed: Zod validation, Drizzle ORM with PostgreSQL, Firebase Auth, rate limiting, HMAC-verified payment webhooks for ABA KHQR and Stripe, and Telegram and email order notifications. The live demo runs without it, using built-in data.

**Testing:** 58 unit tests (filters, product facts, cart and orders) run on every push with GitHub Actions.

## Links

- Live demo: _your deployed link_
- Code: https://github.com/danishsary8/sport-heaven

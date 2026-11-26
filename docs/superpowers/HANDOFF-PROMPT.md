# Handoff prompt: finish Sport Castle

Paste everything below the line into the next AI coding tool.

---

You are continuing the Sport Castle project. It is a football and F1 shop in Phnom Penh with 3 stores: sonthormuk, sensok and chomkadong. Work fully autonomously and never ask questions. Record each decision in `sport-backend/docs/superpowers/OWNER-DECISIONS.md`. Anything only the owner can provide (keys, accounts, prices, domain, legal text, photos) goes in `sport-backend/docs/superpowers/OWNER-TODO.md`.

## Repos and branches

- Repos: `sport-backend` (Node, Express, Drizzle, Postgres) and `sport-heaven` (React 19, Vite 8, Tailwind 4, React Router, TanStack Query).
- Branch: work on `main` in both repos. Everything finished so far is merged there.
- Commit often and push after every task. Never force-push.
- Never put AI model names in code, docs or commits.

## Read first

1. `sport-backend/docs/superpowers/STATUS.md`
2. `sport-heaven/docs/superpowers/specs/2026-11-26-frontend-production-design.md` (the spec)
3. `sport-heaven/docs/superpowers/plans/2026-11-26-fe6-e2e-ci-quality.md` (the current plan)
4. The ledger `sport-heaven/.superpowers/sdd/2026-11-26-fe6/progress.md`
5. `git log --oneline -30`

## Local setup

1. Start Postgres:

   ```bash
   pg_ctlcluster 16 main start
   ```

   User `postgres`, password `postgres`. The databases are `sport_dev` and `sport_test`. The e2e run creates `sport_e2e` itself.

2. Start the backend in `sport-backend`:

   ```bash
   NODE_ENV=development DATABASE_URL=postgres://postgres:postgres@localhost:5432/sport_dev DATABASE_SSL=false COOKIE_SECRET=local-dev-cookie-secret-0123456789abcdef CORS_ORIGINS=http://localhost:5173 AUTH_TEST_MODE=true npx tsx src/server.ts
   ```

3. Start the frontend in `sport-heaven`:

   ```bash
   VITE_AUTH_TEST_MODE=true npx vite --port 5173
   ```

4. Test sign-in: use any `012 xxx xxx` number with the code `123456`.
5. Dev admin: sign in with `011 111 111`, then make it admin with SQL:

   ```sql
   update users set role='admin' where phone_e164='+85511111111';
   ```

6. Frontend checks:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

   - Unit tests: 157 should pass.
   - `npm run build` includes the bundle check.

7. End-to-end tests:

   ```bash
   npx playwright test --trace off
   ```

   - The e2e backend runs on port 3100 with its own `sport_e2e` database. It is started by `e2e/start-backend.mjs`.
   - Chromium is pre-installed; do not install Playwright browsers.

## Done (do not redo)

- FE1–FE5: shop, bag, checkout, KHQR and card payment, orders and tracking, sign-in, account, and the full admin area. The FE5 review findings are fixed.
- FE6 Tasks 1–6:
  - bundle check, which keeps the test sign-in out of production builds
  - e2e tests for all four journeys: guest, member with a return, staff counter sale, and admin price change
  - SPA fallback and sitemap
  - CI workflow
- FE6 Task 7 (performance) is partly done:
  - Google Fonts were removed from `index.html`.
  - Canonical URLs are now absolute.
  - The home stores strip now renders inside the loaded content.

## Remaining tasks, in order

1. **FE6 Task 7: performance.**
   - Build with `npm run build`, serve it with `npx vite preview --port 4174`, and run Lighthouse in mobile mode on `/`, `/c/boots` and `/p/adidas-predator-25-elite-fold-over-tongue-fg`.
   - Pass Lighthouse this Chromium path: `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
   - Target: performance ≥ 85, accessibility ≥ 95, best practices ≥ 95.
   - Last run, before the stores-strip fix: home 72 with CLS 0.35, listing 89, product 90. Re-measure first.
   - If the home LCP (about 3.7 s) still fails, consider preloading the hero image or reducing the main chunk.
   - Record the scores in the ledger.
2. **FE6 Task 8: accessibility.**
   - Add `e2e/a11y.spec.ts` using `@axe-core/playwright` (already installed) with the tags `wcag2a` and `wcag2aa`.
   - Pages: home, listing, product, bag, checkout, sign-in, account, admin overview.
   - There must be zero serious or critical violations. Fix them test-first.
3. **FE6 review.**
   - Run a fresh code review of the FE6 changes.
   - Fix Critical and Important findings test-first.
   - Append the FE6 rulings and deferred minors to `STATUS.md`, then delete `.superpowers/sdd/2026-11-26-fe6`.
4. **Stage 7: full frontend audit.**
   - Write `sport-heaven/docs/superpowers/FRONTEND-AUDIT.md`, mapping each spec section to its evidence.
   - Record the Lighthouse numbers there.
   - Fix what the audit finds.
5. **Stage 8: final report.** Write `sport-backend/docs/superpowers/OVERNIGHT-REPORT.md` with:
   - what was built
   - copy-paste commands to run both apps
   - how to deploy (see `sport-backend/docs/DEPLOYMENT.md` and `sport-heaven/docs/HOSTING.md`)
   - what to check first
   - test counts (backend 724, frontend 157+, e2e 5)
   - links to `OWNER-DECISIONS.md` and `OWNER-TODO.md`

   Also rewrite `OWNER-TODO.md` as a clear step-by-step list. Add these new items:
   - `BACKEND_REPO_TOKEN`, a GitHub secret the CI e2e job uses to check out the backend
   - confirm the domain (sitemap and robots default to sportcastle.com.kh)
   - update the help page text whenever delivery fees or return rules change in the admin

   End with a short plain-language summary for a non-developer owner.

## Rules

- TDD: watch the test fail, then make it pass.
- Run the suite twice before calling a task done.
- After any UI change, take screenshots at 390×844 and 1366×900, in English plus Khmer at least once. Check there is no horizontal scroll at 390.
- Money is integer cents, and prices come only from the API.
- Customers see stock only as ok, low (1–3) or out.
- No personal data in URLs, logs or public responses.
- Copy: sentence case, buttons name the action, no all-caps eyebrows, no "A · B · C" strings.
- Redirect long output to files.

# Ledger — FE6

Plan: docs/superpowers/plans/2026-11-26-fe6-e2e-ci-quality.md

| Task | State | Commit | Notes |
|---|---|---|---|
Pre-flight: Task 2 consumes build:e2e from Task 1; Tasks 3-4 consume e2e/helpers.ts from Task 2 — no conflicts.
| 1 bundle check + build:e2e | done | 5b56322 | RED: prod bundle had test sign-in, 145.7 kB; GREEN after guard. vitest 144/144 twice |
Task 1: Ruling: initial JS budget 150 kB gz, not 120 — react-dom+react-router+query+react alone are ~115 kB gz; app is ~30 kB — costs a slower first load than planned; Lighthouse (Task 7) is the real gate.
Task 1: Ruling: eslint ignores .claude/ (agent worktrees) — they are not project code — none.
| 2 playwright + guest | done | 7a03af7 | guest spec green twice (fresh sport_e2e each run, backend on :3100) |
Task 2: Ruling: backend for e2e on port 3100 with its own sport_e2e database, reset by the webServer command (not globalSetup) — Playwright starts web servers before global setup; dev server on :3000 stays untouched — none
Task 2: Ruling: tranId read from the e2e database — the page's token flow differs for members; PayWay would know the id the same way — none
| 3 member journey | done | 218b3c3 | green 4 of 5 runs, last 3 consecutive; one unexplained 90 s timeout on the first run after a rebuild (CI retries once) |
Task 3: Ruling: helpers navigate in-app after sign-in (nav()) — the test sign-in lives in memory and a reload ends it — none
| 4 staff + price | done | 4706936 | 2 specs green twice |
| 5 hosting fallback | done | 72e7fd8 | _redirects, vercel.json, nginx in docs/HOSTING.md; sitemap from API (2 tests); robots disallows private pages; deep links reload on preview |
Task 5: Ruling: sitemap/robots default to sportcastle.com.kh (the domain in the old files) — owner sets SITE_URL — a wrong domain until the owner confirms (OWNER-TODO)
| 6 CI | done | 5dd66b5 | checks + e2e (Postgres 16 service, backend checked out at the same branch); YAML parsed |
Task 6: Ruling: backend checkout uses secrets.BACKEND_REPO_TOKEN, falling back to the workflow token — the backend repo is separate and may be private — e2e job fails at checkout until the owner adds the secret (OWNER-TODO)

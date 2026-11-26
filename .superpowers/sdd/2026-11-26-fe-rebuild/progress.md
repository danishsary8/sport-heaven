# Ledger — FE2–FE5 rebuild

Plan: docs/superpowers/plans/2026-11-26-fe2-5-rebuild.md. Base: 38aa126 (FE1 task 7).

| Task | State | Commit | Notes |
|---|---|---|---|
| B1 listing | done | 702b7c1 | 6 tests; screens en/km 390+1366 ok |
| B2 home | done | 1f76fe7 | 3 tests; rail width fix (w-full on mx-auto flex child); en/km screens |
| B3 search | done | b2257e2 | 3 tests; overlay + results screens 390/1366 |
| B4 product | done | 1dff083 | 6 tests; screens en/km |
| B5 print studio | done | 3bd51ce | 3 tests; removed invented policy copy; screens |
| B6 stores + help | done | fc2322e | 4 tests; terms/privacy draft; about/size/terms/privacy English-only in km |
| C1 bag | done | 72cc3a7 | 8 tests; km overflow fixed (grid minmax + select w-full) |
| C2 checkout | done | 19fdd85 | 7 tests; focus moves to first invalid field (closes FE3 deferred minor) |
| C3 pay | done | bc25c99 | 5 tests; real flow checked (order, KHQR, dev approve, confirmation); stale-order bug found and fixed test-first |
| C4 order + track | done | bc25c99 | 6 tests (FE3 complete) |
| D1 sign-in | done | 85b314a | 5 tests; real sign-in against backend ok |
| D2 account profile + addresses | done | 2e3281c | tests in account.test.tsx |
| D3 orders, returns, wishlist, points | done | 2e3281c | 8 account tests; reasons sent in English (closes FE4 deferred minor); sign-out guard goes home (FE4 complete) |
| E1 admin layout + overview | done | 408d338 | 4 tests; staff vs admin nav; overview overflow at 390 fixed |
| E2 admin orders | done | 408d338 | 5 tests; pick list, status buttons from the machine, cancel with reason, cash, notes |

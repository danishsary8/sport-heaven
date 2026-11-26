# Ledger — FE6

Plan: docs/superpowers/plans/2026-11-26-fe6-e2e-ci-quality.md

| Task | State | Commit | Notes |
|---|---|---|---|
Pre-flight: Task 2 consumes build:e2e from Task 1; Tasks 3-4 consume e2e/helpers.ts from Task 2 — no conflicts.
| 1 bundle check + build:e2e | done | 5b56322 | RED: prod bundle had test sign-in, 145.7 kB; GREEN after guard. vitest 144/144 twice |
Task 1: Ruling: initial JS budget 150 kB gz, not 120 — react-dom+react-router+query+react alone are ~115 kB gz; app is ~30 kB — costs a slower first load than planned; Lighthouse (Task 7) is the real gate.
Task 1: Ruling: eslint ignores .claude/ (agent worktrees) — they are not project code — none.

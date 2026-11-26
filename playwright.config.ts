import { defineConfig, devices } from '@playwright/test';

const API_PORT = process.env.E2E_API_PORT ?? '3100';

/** e2e runs the e2e build (test sign-in on) in `vite preview` against the real backend on a fresh database. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'off', ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
  webServer: [
    { command: 'node e2e/start-backend.mjs', url: `http://localhost:${API_PORT}/health`, timeout: 120_000, reuseExistingServer: false, stdout: 'pipe' },
    { command: `npm run build:e2e && E2E_API_PORT=${API_PORT} npx vite preview --port 4173 --strictPort`, url: 'http://localhost:4173', timeout: 180_000, reuseExistingServer: false },
  ],
});

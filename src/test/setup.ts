import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { loadLang } from '../lib/i18n';

// Tests render Khmer synchronously, so the on-demand Khmer copy is loaded up front here.
await loadLang('km');

afterEach(() => {
  cleanup();
  // Per-tab conveniences (the hero slide, guest order tokens) must not leak between tests.
  sessionStorage.clear();
});

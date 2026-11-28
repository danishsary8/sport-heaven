import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { loadLang } from '../lib/i18n';

// findBy*/waitFor wait up to 3 s (default 1 s): the first test in a file also loads its lazy page, and under a
// full parallel run that alone can pass 1 s. A passing check still returns as soon as it passes.
configure({ asyncUtilTimeout: 3000 });

// Tests render Khmer synchronously, so the on-demand Khmer copy is loaded up front here.
await loadLang('km');

afterEach(() => {
  cleanup();
  // Per-tab conveniences (the hero slide, guest order tokens) must not leak between tests.
  sessionStorage.clear();
});

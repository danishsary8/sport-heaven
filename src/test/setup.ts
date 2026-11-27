import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Per-tab conveniences (the hero slide, guest order tokens) must not leak between tests.
  sessionStorage.clear();
});

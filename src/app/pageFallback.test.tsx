import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import { PageFallback } from './PageFallback';

describe('PageFallback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits a moment before showing the skeleton, so quick page changes do not flash', () => {
    const { container } = render(
      <I18nProvider initial="en">
        <PageFallback />
      </I18nProvider>,
    );
    expect(container.querySelector('.skeleton')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    act(() => vi.advanceTimersByTime(250));
    expect(container.querySelector('.skeleton')).toBeTruthy();
  });
});

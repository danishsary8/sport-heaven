import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { I18nProvider } from '../lib/i18n';
import { Availability, Price, QueryView, Sheet } from './index';

const withI18n = (ui: React.ReactNode) => render(<I18nProvider initial="en">{ui}</I18nProvider>);

describe('QueryView', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('offers Retry when loading takes longer than 10 seconds', () => {
    const refetch = vi.fn();
    withI18n(
      <QueryView query={{ isPending: true, isError: false, error: null, data: undefined, refetch }} skeleton={<p>skeleton</p>}>
        {() => <p>data</p>}
      </QueryView>,
    );
    expect(screen.getByText('skeleton')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the API error message with Retry', () => {
    const refetch = vi.fn();
    withI18n(
      <QueryView
        query={{ isPending: false, isError: true, error: new ApiError('network', 502, 'The shop is having trouble reaching the server. Try again.'), data: undefined, refetch }}
        skeleton={<p>skeleton</p>}
      >
        {() => <p>data</p>}
      </QueryView>,
    );
    expect(screen.getByText('The shop is having trouble reaching the server. Try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders empty and data states', () => {
    const q = (data: number[]) => ({ isPending: false, isError: false, error: null, data, refetch: vi.fn() });
    const { rerender } = withI18n(
      <QueryView query={q([])} skeleton={null} isEmpty={(d) => d.length === 0} empty={<p>No orders yet</p>}>
        {(d) => <p>{d.length} rows</p>}
      </QueryView>,
    );
    expect(screen.getByText('No orders yet')).toBeTruthy();
    rerender(
      <I18nProvider initial="en">
        <QueryView query={q([1, 2])} skeleton={null} isEmpty={(d) => d.length === 0} empty={<p>No orders yet</p>}>
          {(d) => <p>{d.length} rows</p>}
        </QueryView>
      </I18nProvider>,
    );
    expect(screen.getByText('2 rows')).toBeTruthy();
  });
});

describe('QueryView keeps loaded data', () => {
  it('shows the loaded data when only a background refetch failed', () => {
    render(
      <I18nProvider initial="en">
        <QueryView query={{ isPending: false, isError: true, error: new ApiError('network', 502, 'Down'), data: ['a'], refetch: () => {} }} skeleton={<p>skeleton</p>}>
          {(d) => <p>items {d.length}</p>}
        </QueryView>
      </I18nProvider>,
    );
    expect(screen.getByText('items 1')).toBeTruthy();
    expect(screen.queryByText('Down')).toBeNull();
  });
});

describe('Price and Availability', () => {
  it('shows a sale price with the struck compare-at price', () => {
    withI18n(<Price cents={7600} compareAtCents={9500} />);
    expect(screen.getByText('$76.00')).toBeTruthy();
    expect(screen.getByText('$95.00').tagName).toBe('S');
  });

  it('says how few are left, or sold out', () => {
    const { rerender } = withI18n(<Availability value="low" count={2} />);
    expect(screen.getByText('Only 2 left')).toBeTruthy();
    rerender(
      <I18nProvider initial="en">
        <Availability value="out" />
      </I18nProvider>,
    );
    expect(screen.getByText('Sold out')).toBeTruthy();
  });
});

describe('Sheet', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open menu</button>
        <Sheet open={open} onClose={() => setOpen(false)} side="left" title="Menu">
          <a href="#x">First link</a>
        </Sheet>
      </>
    );
  }

  it('closes on Escape and gives focus back to the opener', () => {
    withI18n(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open menu' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('slides out instead of vanishing: the closed panel stays briefly, inert, then is removed', () => {
    vi.useFakeTimers();
    try {
      withI18n(<Harness />);
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      fireEvent.keyDown(document, { key: 'Escape' });
      const leaving = document.querySelector('[data-sheet="closing"]');
      expect(leaving).toBeTruthy();
      expect(leaving).toHaveAttribute('inert');
      act(() => vi.advanceTimersByTime(400));
      expect(document.querySelector('[data-sheet]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Seo', () => {
  it('writes an absolute canonical URL', async () => {
    const { Seo } = await import('./Seo');
    render(<Seo title="Boots" canonical="/c/boots" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${window.location.origin}/c/boots`);
  });
});

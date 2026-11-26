import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../../lib/i18n';
import type { Facet } from '../api';
import { FilterPanel } from './FilterPanel';

const colours = Array.from({ length: 12 }, (_, i) => ({ value: `c${i + 1}`, label: `Colour ${i + 1}`, count: 1 }));
const facets = [{ key: 'color', label: 'Colour', type: 'multi', options: colours }] as unknown as Facet[];

function renderPanel(url = '/shop') {
  const router = createMemoryRouter([{ path: '/shop', element: <FilterPanel facets={facets} /> }], { initialEntries: [url] });
  render(
    <I18nProvider initial="en">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return within(screen.getByRole('group', { name: 'Colour' }));
}

describe('FilterPanel long option lists', () => {
  it('shows the first eight until the shopper asks for all', () => {
    const group = renderPanel();
    expect(group.getAllByRole('checkbox')).toHaveLength(8);
    fireEvent.click(group.getByRole('button', { name: 'Show all 12' }));
    expect(group.getAllByRole('checkbox')).toHaveLength(12);
    expect(group.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a ticked option visible even when it is past the first eight', () => {
    const group = renderPanel('/shop?color=c11');
    expect(group.getByText('Colour 11').closest('label')!.querySelector('input')).toBeChecked();
    expect(group.getAllByRole('checkbox')).toHaveLength(9);
  });
});

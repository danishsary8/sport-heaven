import type { Facet } from '../api';

/**
 * Facets worth showing. A filter where every option matches a single product cannot narrow anything
 * down: kits and boots each have their own named colourway ("Albiceleste", "Bavarian Red / Pure White"),
 * so their Colour list is one long column of 1s. Such a facet is hidden once it has more than a handful
 * of options. Selected values still show as removable chips above the grid.
 */
export function usefulFacets(facets: Facet[]): Facet[] {
  return facets.filter((f) => {
    if (f.key !== 'color') return true;
    const options = f.options ?? [];
    return !(options.length > 6 && options.every((o) => o.count <= 1));
  });
}

/** Sub-category filters that can name a page on their own (e.g. /c/jerseys?league=Premier League). */
const TITLE_KEYS = ['league', 'surface', 'garmentType', 'kitType'] as const;

/** The one sub-category value in the URL that should title the page, if exactly one is set. */
export function subCategory(params: URLSearchParams): { key: (typeof TITLE_KEYS)[number]; value: string } | null {
  const set = TITLE_KEYS.flatMap((key) => params.getAll(key).map((value) => ({ key, value })));
  return set.length === 1 ? set[0]! : null;
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'XXXL'];

/** Sizes in a sensible order: clothing S→XXL, numeric sizes by number, anything else as given. */
export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    if (i >= 0) return i;
    const n = parseFloat(s.replace(/[^\d.]/g, ''));
    return Number.isNaN(n) ? 1000 : 100 + n;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b));
}

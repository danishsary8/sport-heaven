import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * The storefront's type scale for headings, in one place.
 *
 * Headlines are set in Barlow Condensed, tight like a shirt nameset. `page` titles open a page
 * (listing, stores, bag); `compact` titles sit in narrower layouts (account, checkout, sign-in, help).
 */
const TITLE_SIZES = {
  page: 'text-[44px] leading-[0.9] lg:text-[64px]',
  compact: 'text-[40px] leading-[0.95] lg:text-5xl',
} as const;

export type PageTitleSize = keyof typeof TITLE_SIZES;

/** The page's one `<h1>`. */
export function PageTitle({ children, size = 'compact', className, id }: { children: ReactNode; size?: PageTitleSize; className?: string; id?: string }) {
  return (
    <h1 id={id} className={cx('font-display font-bold tracking-[-0.01em]', TITLE_SIZES[size], className)}>
      {children}
    </h1>
  );
}

/** A section heading (`<h2>`) inside a page. Pass `id` when a landmark is labelled by it. */
export function SectionTitle({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={cx('font-display text-[34px] font-bold leading-[0.95] tracking-[-0.005em] lg:text-5xl', className)}>
      {children}
    </h2>
  );
}

/** The storefront's content width with its side gutters (16px on phones, 32px on desktop). */
export const CONTAINER = 'mx-auto w-full max-w-[1320px] px-4 lg:px-8';

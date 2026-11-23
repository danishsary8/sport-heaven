import { flushSync } from 'react-dom';

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
  };
};

/**
 * Guarantees that at most ONE DOM element owns `view-transition-name: active-product-media`
 * right before a View Transition old-state snapshot is captured, eliminating duplicate
 * view-transition-name collisions when multiple cards display the same swatch/product.
 */
export function clearMorphSources(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-vt-morph-source]').forEach((node) => {
    node.style.viewTransitionName = '';
    delete node.dataset.vtMorphSource;
  });
}

export function assignMorphSource(el: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  clearMorphSources();
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/product/')) {
    return;
  }
  if (el) {
    el.dataset.vtMorphSource = 'true';
    el.style.viewTransitionName = 'active-product-media';
  }
}

/**
 * Runs a state update inside the native CSS View Transitions API for true
 * GPU-composited morph transitions (e.g. Product Card -> PDP hero image,
 * tab panels, filter changes), with graceful instant fallback when unsupported
 * or when the user prefers reduced motion.
 */
export function runWithViewTransition(update: () => void): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    update();
    return;
  }

  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  const doc = document as ViewTransitionDocument;

  if (prefersReducedMotion || typeof doc.startViewTransition !== 'function') {
    clearMorphSources();
    update();
    return;
  }

  try {
    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });
    transition?.finished?.finally(() => {
      clearMorphSources();
    });
  } catch {
    clearMorphSources();
    update();
  }
}

/**
 * The add-to-bag flight. The button that was pressed hands over a copy of itself: the copy shrinks from a
 * pill into a round bag icon, arcs up to the header's bag and lands there; the header bag then bumps.
 * With reduced motion (or no visible header bag) the flight is skipped and only the bag's count changes.
 */

import { BAG_BUMP } from './bagEvents';

const BAG_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';

function visibleBag(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('[data-bag-target]');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function flyToBag(from: Element | null): Promise<void> {
  const bump = () => window.dispatchEvent(new CustomEvent(BAG_BUMP));
  const target = visibleBag();
  if (!from || !target || reducedMotion() || typeof document.body.animate !== 'function') {
    bump();
    return Promise.resolve();
  }

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = 46;
  const startRadius = getComputedStyle(from).borderRadius || '8px';

  const flyer = document.createElement('div');
  flyer.className = 'bag-flyer';
  flyer.innerHTML = BAG_ICON;
  Object.assign(flyer.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, borderRadius: startRadius });
  document.body.appendChild(flyer);

  // 1. Morph: the pill closes into a circle around its own centre.
  const cx = a.left + a.width / 2 - size / 2;
  const cy = a.top + a.height / 2 - size / 2;
  const morph = flyer.animate(
    [
      { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, borderRadius: startRadius },
      { left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px`, borderRadius: '999px' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
  );

  // 2. Flight: an arc that rises above both ends, shrinking to the size of the header icon.
  const dx = b.left + b.width / 2 - (cx + size / 2);
  const dy = b.top + b.height / 2 - (cy + size / 2);
  const lift = Math.min(160, Math.max(70, Math.abs(dx) * 0.25));
  return morph.finished
    .then(() => {
      Object.assign(flyer.style, { left: `${cx}px`, top: `${cy}px`, width: `${size}px`, height: `${size}px`, borderRadius: '999px' });
      morph.cancel();
      return flyer.animate(
        [
          { transform: 'translate(0, 0) scale(1)', offset: 0 },
          { transform: `translate(${dx * 0.45}px, ${Math.min(0, dy) - lift}px) scale(0.9)`, offset: 0.45, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
          { transform: `translate(${dx}px, ${dy}px) scale(0.42)`, offset: 1, opacity: 0.35 },
        ],
        { duration: 680, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
      ).finished;
    })
    .catch(() => undefined)
    .then(() => {
      flyer.remove();
      bump();
    });
}

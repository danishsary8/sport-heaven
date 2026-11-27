import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../lib/i18n';
import { HeroCarousel, SLIDE_MS, type HeroSlide } from './parts/HeroCarousel';

const slides: HeroSlide[] = [
  { id: 'a', title: 'Matchday gear', cta: 'Shop new arrivals', href: '/collections/new-arrivals', tone: 'photo', image: '/x.jpg', products: [] },
  { id: 'b', title: 'Champions League nights', cta: 'Shop the UCL drop', href: '/collections/ucl-2026-27', tone: 'night', products: ['/a.jpg', '/b.jpg'] },
  { id: 'c', title: 'Retro classics', cta: 'Shop retro jerseys', href: '/collections/retro-jerseys', tone: 'light', products: ['/c.jpg'] },
];

function renderCarousel(s = slides) {
  const router = createMemoryRouter([{ path: '/', element: <HeroCarousel slides={s} /> }]);
  return render(
    <I18nProvider initial="en">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

const visibleTitle = () => screen.getByRole('heading').textContent;

afterEach(() => vi.unstubAllGlobals());

describe('HeroCarousel', () => {
  it('shows one slide at a time; the first title is the page heading', () => {
    renderCarousel();
    expect(screen.getByRole('heading', { level: 1, name: 'Matchday gear' })).toBeTruthy();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Shop new arrivals' })).toHaveAttribute('href', '/collections/new-arrivals');
    expect(screen.queryByRole('link', { name: 'Shop the UCL drop' })).toBeNull();
  });

  it('moves with the arrows and wraps around', () => {
    renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(visibleTitle()).toBe('Champions League nights');
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(visibleTitle()).toBe('Retro classics');
  });

  it('jumps to a slide from its progress bar and marks it current', () => {
    renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));
    expect(visibleTitle()).toBe('Retro classics');
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toHaveAttribute('aria-current', 'true');
  });

  it('answers the arrow keys', () => {
    renderCarousel();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Featured' }), { key: 'ArrowRight' });
    expect(visibleTitle()).toBe('Champions League nights');
  });

  it('advances when the progress bar finishes, and the pause button stops it', () => {
    const { container } = renderCarousel();
    const bar = () => container.querySelector('.hero-progress')!;
    // jsdom has no AnimationEvent, so React listens for the prefixed name; fire both to be safe.
    act(() => {
      bar().dispatchEvent(new Event('webkitAnimationEnd', { bubbles: true }));
    });
    if (visibleTitle() !== 'Champions League nights') act(() => void fireEvent.animationEnd(bar()));
    expect(visibleTitle()).toBe('Champions League nights');
    fireEvent.click(screen.getByRole('button', { name: 'Pause slides' }));
    expect((bar() as HTMLElement).style.animationPlayState).toBe('paused');
    expect(screen.getByRole('button', { name: 'Play slides' })).toBeTruthy();
  });

  it('still moves on by itself under reduced motion, with a timer and no animation', () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} }));
    const { container } = renderCarousel();
    expect(container.querySelector('.hero-progress')).toBeNull();
    act(() => vi.advanceTimersByTime(SLIDE_MS));
    expect(visibleTitle()).toBe('Champions League nights');
    fireEvent.click(screen.getByRole('button', { name: 'Pause slides' }));
    act(() => vi.advanceTimersByTime(SLIDE_MS * 2));
    expect(visibleTitle()).toBe('Champions League nights');
    vi.useRealTimers();
  });

  it('keeps playing after a mouse click on the arrows (only keyboard focus pauses it)', () => {
    const { container } = renderCarousel();
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect((container.querySelector('.hero-progress') as HTMLElement).style.animationPlayState).toBe('running');
  });

  it('shows a single slide without controls', () => {
    renderCarousel([slides[0]!]);
    expect(screen.queryByRole('button', { name: 'Next slide' })).toBeNull();
  });
});

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../../../../lib/i18n';
import { CONTAINER, Picture, cx } from '../../../../ui';
import type { SlideTone } from '../heroSlides';

/** One slide, with its copy already translated. */
export interface HeroSlide {
  id: string;
  title: string;
  body?: string;
  cta: string;
  href: string;
  tone: SlideTone | 'photo';
  image?: string;
  /** Which side the text sits on (desktop). */
  align?: 'start' | 'end';
  /** object-position for the photo, keeping the subject in frame on narrow screens. */
  focus?: string;
  /** Where the text sits vertically on desktop: centred, or low (under a raised arm, say). */
  valign?: 'center' | 'bottom';
  /** A smaller, wider headline (two lines) for photos with little free space. */
  compact?: boolean;
  products: string[];
}

/** How long each slide stays before the next one (the progress bar runs for this long). */
export const SLIDE_MS = 6500;
const SWIPE_PX = 48;

const TONES: Record<HeroSlide['tone'], string> = {
  photo: 'bg-obsidian text-paper',
  night: 'hero-night text-paper',
  cobalt: 'hero-cobalt text-paper',
  light: 'stage text-obsidian',
};

const SLIDE_KEY = 'sc.heroSlide';

/** The slide shown last in this tab (sessionStorage: a per-tab convenience, so failures are ignored). */
function readSavedSlide(): number {
  try {
    return Number(sessionStorage.getItem(SLIDE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveSlide(i: number) {
  try {
    sessionStorage.setItem(SLIDE_KEY, String(i));
  } catch {}
}

function isFocusVisible(el: EventTarget): boolean {
  try {
    return el instanceof HTMLElement && el.matches(':focus-visible');
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const [reduced, setReduced] = useState(() => query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [query]);
  return reduced;
}

/**
 * The home page's opening carousel: the hero from the API first, then campaign slides.
 *
 * - Advances every {@link SLIDE_MS} ms, driven by the progress bar's CSS animation, so pausing the bar
 *   (hover, keyboard focus, the pause button) pauses the carousel at exactly the same point.
 * - Never moves by itself under reduced motion; arrows, dots, swipe and the arrow keys always work.
 * - Hidden slides are `inert`, so keyboard and screen-reader users only meet the visible one.
 * - Product photos load for the visible and the next slide only.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const { t } = useI18n();
  const reducedMotion = usePrefersReducedMotion();
  const count = slides.length;
  // Coming back to the home page continues from the slide you left, instead of restarting.
  const [index, setIndex] = useState(() => Math.min(readSavedSlide(), Math.max(count - 1, 0)));
  const [userPaused, setUserPaused] = useState(false);
  // Keyboard focus inside pauses it (WCAG 2.2.2); a mouse click on an arrow or dot does not.
  const [focused, setFocused] = useState(false);
  // The slide being covered and the direction of travel, for the curtain transition.
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0, index]));
  const swipeStart = useRef<number | null>(null);

  const go = useCallback(
    (to: number, direction?: 1 | -1) => {
      const next = ((to % count) + count) % count;
      if (next === index) return;
      setDir(direction ?? (to > index ? 1 : -1));
      setPrev(index);
      setIndex(next);
      saveSlide(next);
      setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
    },
    [count, index],
  );

  const autoplay = count > 1;
  const paused = userPaused || focused;

  // Under reduced motion there is no progress animation to drive autoplay, so a timer does it
  // (slides then swap without any movement).
  useEffect(() => {
    if (!autoplay || !reducedMotion || paused) return;
    const timer = setTimeout(() => go(index + 1, 1), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [autoplay, reducedMotion, paused, index, go]);

  // Warm the next slide's photos a moment before it shows.
  const upcoming = (index + 1) % count;
  useEffect(() => {
    if (count < 2) return;
    const timer = setTimeout(() => setVisited((v) => (v.has(upcoming) ? v : new Set(v).add(upcoming))), 1500);
    return () => clearTimeout(timer);
  }, [upcoming, count]);

  if (count === 0) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1, 1);
    else if (e.key === 'ArrowLeft') go(index - 1, -1);
    else return;
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') swipeStart.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };

  const active = slides[index]!;
  const dark = active.tone !== 'light';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('hero.label')}
      className="relative isolate overflow-hidden"
      onFocus={(e) => setFocused(isFocusVisible(e.target))}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeStart.current = null)}
    >
      <div className="relative h-[min(88svh,760px)] min-h-[560px] lg:h-[min(80vh,800px)]">
        {slides.map((slide, i) => (
          <Slide
            key={slide.id}
            slide={slide}
            active={i === index}
            covered={i === prev}
            dir={prev === null ? null : dir}
            first={i === 0}
            load={visited.has(i)}
            position={t('hero.slide', { n: i + 1, total: count })}
          />
        ))}
      </div>

      {count > 1 && (
        <div className={cx('absolute inset-x-0 bottom-0 z-20', dark ? 'text-paper' : 'text-obsidian')}>
          <div className={`${CONTAINER} flex items-center gap-4 pb-6 lg:pb-8`}>
            <ol className="flex flex-1 gap-1.5" aria-label={t('hero.label')}>
              {slides.map((slide, i) => (
                <li key={slide.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={t('hero.goTo', { n: i + 1 })}
                    aria-current={i === index ? 'true' : undefined}
                    className="group block w-full py-3"
                  >
                    <span className={cx('relative block h-[3px] overflow-hidden rounded-full', dark ? 'bg-paper/25' : 'bg-obsidian/15')}>
                      {i < index && <span className={cx('absolute inset-0', dark ? 'bg-paper' : 'bg-obsidian')} />}
                      {i === index &&
                        (autoplay && !reducedMotion ? (
                          <span
                            key={`${slide.id}-${index}`}
                            className={cx('hero-progress absolute inset-y-0 left-0', dark ? 'bg-paper' : 'bg-obsidian')}
                            style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } as CSSProperties}
                            onAnimationEnd={() => go(index + 1, 1)}
                          />
                        ) : (
                          <span className={cx('absolute inset-0', dark ? 'bg-paper' : 'bg-obsidian')} />
                        ))}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="tabular hidden min-w-[4.5rem] text-right text-sm font-semibold sm:block" aria-hidden>
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
            <div className="flex items-center gap-1.5">
              {autoplay && (
                <HeroButton dark={dark} label={userPaused ? t('hero.play') : t('hero.pause')} onClick={() => setUserPaused(!userPaused)}>
                  {userPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                </HeroButton>
              )}
              <HeroButton dark={dark} label={t('hero.prev')} onClick={() => go(index - 1, -1)}>
                <ChevronLeft className="size-5" aria-hidden />
              </HeroButton>
              <HeroButton dark={dark} label={t('hero.next')} onClick={() => go(index + 1, 1)}>
                <ChevronRight className="size-5" aria-hidden />
              </HeroButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HeroButton({ dark, label, onClick, children }: { dark: boolean; label: string; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'grid size-11 place-items-center rounded-full border backdrop-blur transition-colors',
        dark ? 'border-paper/30 bg-obsidian/20 hover:bg-paper hover:text-obsidian focus-visible:outline-paper' : 'border-obsidian/20 bg-paper/50 hover:bg-obsidian hover:text-paper',
      )}
    >
      {children}
    </button>
  );
}

function Slide({
  slide,
  active,
  covered,
  dir,
  first,
  load,
  position,
}: {
  slide: HeroSlide;
  active: boolean;
  /** The slide the active one is sliding over (kept visible underneath until the reveal ends). */
  covered: boolean;
  /** Direction of travel; null on first load, so the opening slide shows at once (no delay to LCP). */
  dir: 1 | -1 | null;
  first: boolean;
  load: boolean;
  position: string;
}) {
  const Title = first ? 'h1' : 'h2';
  const photo = Boolean(slide.image);
  const end = photo && slide.align === 'end';
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={position}
      aria-hidden={!active}
      inert={!active}
      data-active={active || undefined}
      data-reveal={active && dir !== null ? (dir === 1 ? 'next' : 'prev') : undefined}
      className={cx('hero-slide absolute inset-0', TONES[slide.tone], active ? 'z-10 opacity-100' : covered ? 'z-[5] opacity-100' : 'z-0 opacity-0')}
    >
      {photo && (
        <>
          <Picture
            src={slide.image}
            alt=""
            sizes="100vw"
            priority={first}
            width={1440}
            height={900}
            className="hero-kenburns absolute inset-0 -z-20 h-full w-full"
            imgStyle={slide.focus ? { objectPosition: slide.focus } : undefined}
          />
          {/* Shade only the side the text sits on (the bottom on phones), so the player stays bright. */}
          <div
            aria-hidden
            className={cx(
              'absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(14_17_19/0.95)_0%,rgb(14_17_19/0.78)_38%,rgb(14_17_19/0.25)_62%,rgb(14_17_19/0)_80%)]',
              end
                ? 'lg:bg-[linear-gradient(270deg,rgb(14_17_19/0.92)_0%,rgb(14_17_19/0.7)_30%,rgb(14_17_19/0)_55%)]'
                : 'lg:bg-[linear-gradient(90deg,rgb(14_17_19/0.92)_0%,rgb(14_17_19/0.7)_30%,rgb(14_17_19/0)_55%)]',
            )}
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 hidden h-40 bg-gradient-to-t from-obsidian/70 to-transparent lg:block" />
        </>
      )}

      <div className={`${CONTAINER} relative grid h-full grid-rows-[1fr_auto] pb-24 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-1 lg:items-center lg:gap-10 lg:pb-20 lg:pt-0`}>
        {!photo && slide.products.length > 0 && (
          <div className="relative row-start-1 min-h-0 lg:col-start-2 lg:h-[78%]" aria-hidden>
            {load && <ProductFan products={slide.products} />}
          </div>
        )}

        <div
          className={cx(
            'row-start-2 self-end lg:row-start-1',
            slide.valign === 'bottom' ? 'lg:self-end lg:pb-6' : 'lg:self-center',
            end ? 'lg:col-start-2 lg:justify-self-end' : 'lg:col-start-1',
            photo && 'row-start-1 row-end-3 lg:max-w-[440px] lg:pt-10',
          )}
        >
          <span aria-hidden className="hero-rise flag-rule mb-5 block h-3 w-[72px] lg:mb-7 lg:h-4 lg:w-24" style={{ '--d': '0ms' } as CSSProperties} />
          <Title
            className={cx(
              'hero-rise max-w-[13ch] font-display font-extrabold uppercase leading-[0.86] tracking-[-0.015em]',
              // Photo headlines scale with the screen's height too, so short laptop screens (720–800px)
              // keep the text block clear of the players.
              photo
                ? slide.compact
                  ? 'max-w-[17ch] text-[clamp(40px,min(9vw,8.5vh),76px)] [text-shadow:0_2px_24px_rgb(14_17_19/0.35)]'
                  : 'text-[clamp(44px,min(10vw,11vh),96px)] [text-shadow:0_2px_24px_rgb(14_17_19/0.35)]'
                : 'text-[clamp(48px,min(11vw,13vh),128px)]',
            )}
            style={{ '--d': '80ms' } as CSSProperties}
          >
            {slide.title}
          </Title>
          {slide.body && (
            <p className={cx('hero-rise mt-4 max-w-[42ch] text-base leading-snug lg:mt-5 lg:text-xl', slide.tone === 'light' ? 'text-graphite' : 'text-paper/85')} style={{ '--d': '160ms' } as CSSProperties}>
              {slide.body}
            </p>
          )}
          <Link
            to={slide.href}
            tabIndex={active ? undefined : -1}
            className={cx(
              'hero-rise group mt-6 inline-flex h-13 w-fit items-center gap-2.5 rounded-[6px] px-7 text-base font-semibold transition-colors lg:mt-8',
              slide.tone === 'light' ? 'bg-obsidian text-paper hover:bg-[#2A2E31]' : 'bg-paper text-obsidian hover:bg-stone focus-visible:outline-paper',
            )}
            style={{ '--d': '240ms' } as CSSProperties}
          >
            {slide.cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Two or three product photos as cards: the first in front, the others tilted behind it. */
function ProductFan({ products }: { products: string[] }) {
  const cards = products.slice(0, 3);
  const layout = cards.length === 3 ? ['z-20 left-1/2 -translate-x-1/2', 'z-10 left-[4%]', 'z-10 right-[4%]'] : ['z-20 left-[12%]', 'z-10 right-[12%]'];
  const tilt = cards.length === 3 ? ['0deg', '-7deg', '7deg'] : ['-4deg', '5deg'];
  return (
    <div className="absolute inset-0">
      {cards.map((src, i) => (
        <div
          key={src}
          className={cx('hero-card absolute top-1/2 aspect-[3/4] h-[86%] max-h-[520px] -translate-y-1/2 overflow-hidden rounded-[10px] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)]', layout[i])}
          style={{ '--r': tilt[i], '--d': `${120 + i * 90}ms`, ...(i > 0 ? { height: '74%' } : {}) } as CSSProperties}
        >
          <Picture src={src} alt="" sizes="(min-width: 1024px) 22vw, 40vw" className="block h-full w-full" />
        </div>
      ))}
    </div>
  );
}

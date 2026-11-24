import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Product } from '../../types/store';
import { useStore } from '../../context/StoreContext';
import { HERO_KIT_SLUGS, HERO_SIDE_MS, HERO_TEAM_LINKS } from '../../data/hero';
import { assignMorphSource } from '../../hooks/useViewTransition';
import { formatUsd } from '../../utils/commerce';
import { getKitBackPrintDefaults } from '../../utils/kitCardView';
import { routeToHash } from '../../utils/router';
import { teamDisplayName } from '../../lib/shop-filters';
import { JerseyPreviewSvg } from './JerseyPreviewSvg';

type Side = 'front' | 'back';
const TICK_MS = 100;
const CYCLE_MS = HERO_SIDE_MS * 2;

/**
 * Home hero: one large kit at a time that turns from front to back,
 * with a team rail beside it. Real photos (npm run images) replace the
 * placeholder front and the drawn back automatically.
 */
export function KitStageHero() {
  const { catalog, navigate, navigateToShop } = useStore();
  const reduceMotion = Boolean(useReducedMotion());

  const kits = useMemo<Product[]>(() => {
    const bySlug = new Map(catalog.map((p) => [p.slug, p]));
    const picked: Product[] = [];
    for (const slug of HERO_KIT_SLUGS) {
      const product = bySlug.get(slug);
      if (product) picked.push(product);
    }
    return picked.length >= 2 ? picked : catalog.filter((p) => p.category === 'jerseys').slice(0, 6);
  }, [catalog]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [side, setSide] = useState<Side>('front');
  const [elapsed, setElapsed] = useState(0);
  // Autoplay: off for reduced motion; stops for good once the visitor takes control.
  const [autoplay, setAutoplay] = useState(!reduceMotion);
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);

  const kit = kits[index % kits.length];
  const running = autoplay && !hovering && !focusWithin && !tabHidden && kits.length > 1;

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const goTo = useCallback(
    (next: number, dir: 1 | -1) => {
      setDirection(dir);
      setIndex(((next % kits.length) + kits.length) % kits.length);
      setSide('front');
      setElapsed(0);
    },
    [kits.length],
  );

  // Autoplay timeline: front → back → next kit.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsed((t) => {
        const next = t + TICK_MS;
        if (next >= CYCLE_MS) {
          setDirection(1);
          setIndex((i) => (i + 1) % kits.length);
          setSide('front');
          return 0;
        }
        if (next >= HERO_SIDE_MS) setSide('back');
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, kits.length]);

  /** Any manual control hands the carousel to the visitor. */
  const takeControl = () => setAutoplay(false);
  const step = (dir: 1 | -1) => {
    takeControl();
    goTo(index + dir, dir);
  };
  const flip = (to?: Side) => {
    takeControl();
    setSide((s) => to ?? (s === 'front' ? 'back' : 'front'));
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 60) return;
    dragged.current = true;
    step(info.offset.x < 0 ? 1 : -1);
  };

  const openKit = () => {
    assignMorphSource(stageRef.current);
    navigate({ page: 'product', slug: kit.slug }, kit.slug);
  };

  if (!kit) return null;
  const team = teamDisplayName(kit.club ?? kit.brand);
  const kitLabel = `${kit.season} ${(kit.kitType ?? 'home').toLowerCase()} jersey`;

  return (
    <section aria-labelledby="hero-title" className="bg-[#FAF9F5]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-8 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-[1fr_1fr] lg:gap-x-14 lg:gap-y-10 lg:px-10 lg:pb-16 lg:pt-12">
        {/* Words */}
        <div className="max-w-xl lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1
            id="hero-title"
            className="font-display text-[46px] font-semibold leading-[0.92] tracking-[-0.01em] text-[#1B1E1B] text-balance sm:text-[76px] xl:text-[96px]"
          >
            Your team’s new kit, front and back.
          </h1>
          <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-[#4A4F49] sm:text-[17px]">
            Home, away and third shirts for 2026/27 from the big European leagues and the 2026 national teams.
            Add your name and number at any of our Phnom Penh stores.
          </p>
          <a
            href={routeToHash({ page: 'shop', collectionSlug: 'jerseys-kits' })}
            onClick={(e) => {
              e.preventDefault();
              navigateToShop({ category: 'jerseys' });
            }}
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#1B1E1B] px-8 text-[15px] font-semibold text-white hover:bg-[#33372f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] focus-visible:ring-offset-2"
          >
            Shop jerseys
          </a>
        </div>

        {/* Team quick links: under the words on desktop, under the carousel on mobile */}
        <div className="max-w-xl lg:col-start-1 lg:row-start-2 lg:self-start">
          <div>
            <h2 className="text-sm font-semibold text-[#1B1E1B]">Jump to your team</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {HERO_TEAM_LINKS.map((link) => {
                const params = `team=${link.team}`;
                return (
                  <li key={link.team}>
                    <a
                      href={routeToHash({ page: 'shop', collectionSlug: 'jerseys-kits', params })}
                      onClick={(e) => {
                        e.preventDefault();
                        navigateToShop({ category: 'jerseys', params });
                      }}
                      className="inline-flex min-h-11 items-center rounded-full border border-[#1B1E1B]/15 bg-white px-4 text-sm text-[#1B1E1B] hover:border-[#1B1E1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]"
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Kit stage + rail */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="New kits"
          className="row-start-2 flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex-row lg:items-start"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setFocusWithin(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false);
          }}
        >
          <div className="w-full lg:w-[min(46vw,520px)]">
            <div
              ref={stageRef}
              tabIndex={0}
              aria-label={`${kit.name}, showing the ${side}. Press Enter to turn, left and right arrows for other kits.`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') step(1);
                else if (e.key === 'ArrowLeft') step(-1);
                else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  flip();
                }
              }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-[#ECE9E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF9F5]"
              style={{ perspective: 1600 }}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={kit.id}
                  custom={direction}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 80, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -80, scale: 0.96 }}
                  transition={reduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 30 }}
                  drag={kits.length > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragStart={() => (dragged.current = false)}
                  onDragEnd={onDragEnd}
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    flip();
                  }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  <KitFlipCard product={kit} side={side} reduceMotion={reduceMotion} />
                </motion.div>
              </AnimatePresence>

              {/* Front / back switch */}
              <div
                role="group"
                aria-label="Kit side"
                className="absolute left-4 top-4 z-10 flex rounded-full bg-white/90 p-1 shadow-sm backdrop-blur"
              >
                {(['front', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={side === s}
                    onClick={() => flip(s)}
                    className={`min-h-10 rounded-full px-4 text-sm font-medium capitalize transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] ${
                      side === s ? 'bg-[#1B1E1B] text-white' : 'text-[#1B1E1B] hover:bg-[#1B1E1B]/[0.06]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Previous / next */}
              {kits.length > 1 && (
                <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                  {([-1, 1] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => step(dir)}
                      aria-label={dir === -1 ? 'Previous kit' : 'Next kit'}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#1B1E1B] shadow-sm backdrop-blur hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] cursor-pointer"
                    >
                      {dir === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="mt-5 flex items-end justify-between gap-4" aria-live={running ? 'off' : 'polite'}>
              <div className="min-w-0">
                <p className="font-display text-[34px] font-semibold leading-none text-[#1B1E1B]">{team}</p>
                <p className="mt-1.5 text-[15px] text-[#4A4F49]">
                  {kitLabel}, from <span className="font-semibold tabular-nums text-[#1B1E1B]">{formatUsd(kit.price)}</span>
                </p>
              </div>
              <a
                href={routeToHash({ page: 'product', slug: kit.slug })}
                onClick={(e) => {
                  e.preventDefault();
                  openKit();
                }}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[#1B1E1B] px-5 text-sm font-semibold text-[#1B1E1B] hover:bg-[#1B1E1B] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]"
              >
                View kit
              </a>
            </div>
          </div>

          {/* Kit rail: vertical on desktop, horizontal on mobile */}
          {kits.length > 1 && (
            <div className="flex items-center gap-3 lg:w-[80px] lg:flex-col lg:items-stretch">
              <ul
                aria-label="Choose a kit"
                className="-mx-4 flex flex-1 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden"
              >
                {kits.map((k, i) => {
                  const active = i === index;
                  return (
                    <li key={k.id} className="shrink-0">
                      <button
                        type="button"
                        aria-label={`Show ${k.name}`}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => {
                          takeControl();
                          goTo(i, i >= index ? 1 : -1);
                        }}
                        className={`group relative block w-[72px] overflow-hidden rounded-2xl bg-[#ECE9E2] transition-[opacity,box-shadow] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] lg:w-full ${
                          active ? 'ring-2 ring-[#1B1E1B]' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={k.media?.front ?? k.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className={`aspect-[4/5] w-full ${k.media?.isPhoto ? 'object-contain bg-white p-1.5' : 'object-cover'}`}
                        />
                        {active && running && (
                          <span aria-hidden="true" className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-[#899283]/40">
                            <span
                              className="block h-full rounded-full bg-[#A37B5C] transition-[width] duration-100 ease-linear"
                              style={{ width: `${(elapsed / CYCLE_MS) * 100}%` }}
                            />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setAutoplay((v) => !v)}
                aria-label={autoplay ? 'Pause kit slideshow' : 'Play kit slideshow'}
                className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-[#1B1E1B]/15 bg-white text-[#1B1E1B] hover:border-[#1B1E1B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C] cursor-pointer"
              >
                {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Front and back faces of one kit. Turns in 3D, or fades when motion is reduced. */
function KitFlipCard({ product, side, reduceMotion }: { product: Product; side: Side; reduceMotion: boolean }) {
  const back = useMemo(() => getKitBackPrintDefaults(product), [product]);
  const isBack = side === 'back';
  const frontPhoto = product.media?.isPhoto;
  const backPhoto = product.media?.back;

  const face = 'absolute inset-0 flex items-center justify-center [backface-visibility:hidden]';
  const front = (
    <img
      src={product.media?.front ?? product.image}
      alt={`Front of ${product.name}`}
      draggable={false}
      referrerPolicy="no-referrer"
      className={`h-full w-full select-none ${frontPhoto ? 'object-contain p-8' : 'object-cover'}`}
    />
  );
  const rear = backPhoto ? (
    <img
      src={backPhoto}
      alt={`Back of ${product.name}`}
      draggable={false}
      referrerPolicy="no-referrer"
      className="h-full w-full select-none object-contain p-8"
    />
  ) : product.jerseyTheme ? (
    <div className="w-[78%]" role="img" aria-label={`Back of ${product.name} with ${back.playerName} ${back.squadNumber}`}>
      <JerseyPreviewSvg
        theme={product.jerseyTheme}
        playerName={back.playerName}
        squadNumber={back.squadNumber}
        patch={back.patch}
        fontStyle={back.fontStyle}
      />
    </div>
  ) : (
    front
  );

  if (reduceMotion) {
    return (
      <div className="relative h-full w-full">
        <div className={`${face} transition-opacity duration-200 ${isBack ? 'opacity-0' : 'opacity-100'}`}>{front}</div>
        <div className={`${face} transition-opacity duration-200 ${isBack ? 'opacity-100' : 'opacity-0'}`}>{rear}</div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative h-full w-full [transform-style:preserve-3d]"
      animate={{ rotateY: isBack ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20, mass: 0.9 }}
    >
      <div className={face} aria-hidden={isBack}>
        {front}
      </div>
      <div className={`${face} [transform:rotateY(180deg)]`} aria-hidden={!isBack}>
        {rear}
      </div>
    </motion.div>
  );
}

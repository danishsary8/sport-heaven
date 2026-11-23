import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  F1GarmentType,
  GridDensity,
  KitEditionType,
  LeagueId,
  NationalRegion,
  ProductFilters,
  SortOption,
} from '../../types/store';
import {
  F1_TEAMS,
  JERSEY_EU_SIZE_MAP,
  NATIONAL_TEAM_REGIONS,
  SEASON_FILTER_OPTIONS,
} from '../../utils/commerce';

type OpenPopover =
  | 'league'
  | 'season'
  | 'edition'
  | 'brand'
  | 'size'
  | 'price'
  | 'f1'
  | null;

const KIT_LEAGUES: Array<{ id: LeagueId | 'all'; label: string }> = [
  { id: 'all', label: 'All Competitions' },
  { id: 'International', label: 'National Teams' },
  { id: 'La Liga', label: 'La Liga (Spain)' },
  { id: 'Premier League', label: 'Premier League (England)' },
  { id: 'Serie A', label: 'Serie A (Italy)' },
  { id: 'Bundesliga', label: 'Bundesliga (Germany)' },
  { id: 'Ligue 1', label: 'Ligue 1 (France)' },
  { id: 'Cambodian Premier League', label: 'Cambodia CPL' },
  { id: 'Formula 1', label: 'Formula 1 Paddock' },
];

const KIT_EDITIONS: Array<'all' | KitEditionType> = [
  'all',
  'Home',
  'Away',
  'Third',
  'Retro',
  'Limited Edition',
  'Special Edition',
];

const KIT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const KIT_BRANDS = ['Nike', 'Adidas', 'Puma', 'Puma F1', 'Castore', 'Varaman', 'Jordan / Nike'];

interface KitFilterBarProps {
  title: string;
  itemCount: number;
  filters: ProductFilters;
  selectedEdition: 'all' | KitEditionType;
  onEditionChange: (edition: 'all' | KitEditionType) => void;
  sortBy: SortOption;
  gridDensity: GridDensity;
  onUpdateFilters: (updater: (prev: ProductFilters) => ProductFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onDensityChange: (density: GridDensity) => void;
  onOpenDrawer: () => void;
  onResetAll: () => void;
  activeChips: Array<{ label: string; onClear: () => void }>;
}

/**
 * Minimalist Single-Row Filter Toolbar (Strictly for Jerseys, National Teams & F1 Teamwear)
 * Features inline dropdown popovers for League/Region, Season Year-Year, Edition (Home/Away/Third/Retro/Limited),
 * F1 Garment Type (Jerseys vs Jackets), Brand, EU Sizing (S/EU 46 – XXL/EU 58), and Price.
 */
export function KitFilterBar({
  title,
  itemCount,
  filters,
  selectedEdition,
  onEditionChange,
  sortBy,
  gridDensity,
  onUpdateFilters,
  onSortChange,
  onDensityChange,
  onOpenDrawer,
  onResetAll,
  activeChips,
}: KitFilterBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenPopover>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const togglePopover = (key: Exclude<OpenPopover, null>) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  const toggleBrand = (brand: string) => {
    onUpdateFilters((prev) => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const isF1View = filters.category === 'f1';

  const leagueButtonLabel = (() => {
    if (filters.nationalRegion && filters.nationalRegion !== 'all') {
      return `National · ${filters.nationalRegion}`;
    }
    if (filters.uclOnly) return 'UCL 26/27';
    if (filters.league !== 'all') return filters.league;
    return 'Competition';
  })();

  const seasonButtonLabel = (() => {
    if (!filters.season || filters.season === 'all') return 'Season';
    if (filters.season === 'retro-archive') return 'Retro Archive';
    return filters.season;
  })();

  return (
    <div
      ref={barRef}
      className="sticky top-16 z-20 border-y border-[#0E1113]/10 bg-[#FFFFFF]/96 backdrop-blur-md"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Collection Title + Count + Minimalist Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-3 hidden 2xl:block">
              <p className="text-sm font-semibold text-[#0E1113] leading-tight">
                {title}
              </p>
              <p className="font-mono text-[11px] tabular-nums text-[#5F625C]">
                {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
              </p>
            </div>

            {/* Full Slide-Over Filter Drawer Button */}
            <button
              type="button"
              onClick={onOpenDrawer}
              className="inline-flex h-9 items-center gap-2 border border-[#0E1113] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#0E1113] hover:bg-[#0E1113] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.7} />
              <span>All Filters</span>
              {activeChips.length > 0 && (
                <span className="font-mono text-[10px] font-semibold">
                  ({activeChips.length})
                </span>
              )}
            </button>

            {/* F1 Constructor & Garment Type Popover (When browsing F1) */}
            {isF1View ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => togglePopover('f1')}
                  aria-expanded={openMenu === 'f1'}
                  className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    (filters.f1Team && filters.f1Team !== 'all') ||
                    (filters.f1GarmentType && filters.f1GarmentType !== 'all')
                      ? 'border-[#0E1113] bg-[#0E1113] text-white'
                      : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  <span>
                    {filters.f1Team && filters.f1Team !== 'all'
                      ? filters.f1Team
                      : filters.f1GarmentType === 'jacket'
                        ? 'Paddock Jackets'
                        : filters.f1GarmentType === 'jersey'
                          ? 'Team Jerseys'
                          : 'Team & Garment'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-65" />
                </button>

                {openMenu === 'f1' && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 border border-[#0E1113]/15 bg-[#FFFFFF] p-2.5 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                    <p className="px-2 pb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5F625C]">
                      Garment Type
                    </p>
                    {(
                      [
                        { id: 'all', label: 'All F1 Teamwear' },
                        { id: 'jersey', label: 'Team Jerseys (2 Colors / Team)' },
                        { id: 'jacket', label: 'Official Paddock Jackets' },
                      ] as Array<{ id: F1GarmentType | 'all'; label: string }>
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onUpdateFilters((p) => ({ ...p, f1GarmentType: opt.id }));
                          setOpenMenu(null);
                        }}
                        className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          (filters.f1GarmentType ?? 'all') === opt.id
                            ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                            : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div className="my-2 border-t border-[#0E1113]/10" />
                    <p className="px-2 pb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5F625C]">
                      F1 Constructor
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFilters((p) => ({ ...p, f1Team: 'all' }));
                        setOpenMenu(null);
                      }}
                      className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        !filters.f1Team || filters.f1Team === 'all'
                          ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                          : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      All 4 Constructors
                    </button>
                    {F1_TEAMS.map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => {
                          onUpdateFilters((p) => ({ ...p, f1Team: team }));
                          setOpenMenu(null);
                        }}
                        className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          filters.f1Team === team
                            ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                            : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Competition & National Region Popover */
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => togglePopover('league')}
                  aria-expanded={openMenu === 'league'}
                  className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    filters.league !== 'all' ||
                    filters.uclOnly ||
                    (filters.nationalRegion && filters.nationalRegion !== 'all')
                      ? 'border-[#0E1113] bg-[#0E1113] text-white'
                      : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  <span>{leagueButtonLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-65" />
                </button>

                {openMenu === 'league' && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 border border-[#0E1113]/15 bg-[#FFFFFF] p-2.5 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                    <p className="px-2 pb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5F625C]">
                      National Teams by Region
                    </p>
                    {NATIONAL_TEAM_REGIONS.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => {
                          onUpdateFilters((p) => ({
                            ...p,
                            league: 'International',
                            nationalRegion: reg.id as NationalRegion,
                            uclOnly: false,
                          }));
                          setOpenMenu(null);
                        }}
                        className={`flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          filters.nationalRegion === reg.id
                            ? 'bg-[#0E1113] text-white font-medium'
                            : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <span>{reg.label}</span>
                        <span className="truncate pl-2 font-mono text-[9.5px] opacity-65">
                          {reg.countriesHint.split(',').slice(0, 2).join(',')}
                        </span>
                      </button>
                    ))}
                    <div className="my-2 border-t border-[#0E1113]/10" />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFilters((p) => ({
                          ...p,
                          uclOnly: !p.uclOnly,
                          league: 'all',
                          nationalRegion: 'all',
                        }));
                        setOpenMenu(null);
                      }}
                      className={`mb-1 flex w-full items-center justify-between px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                        filters.uclOnly
                          ? 'bg-[#0E1113] text-white font-medium'
                          : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <span>UEFA Champions League</span>
                      <span className="font-mono text-[10px] opacity-70">26/27</span>
                    </button>
                    {KIT_LEAGUES.map((lg) => (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => {
                          onUpdateFilters((p) => ({
                            ...p,
                            league: lg.id,
                            nationalRegion: 'all',
                            uclOnly: false,
                          }));
                          setOpenMenu(null);
                        }}
                        className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                          filters.league === lg.id &&
                          !filters.uclOnly &&
                          (!filters.nationalRegion || filters.nationalRegion === 'all')
                            ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                            : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {lg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Season Year-Year Popover */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => togglePopover('season')}
                aria-expanded={openMenu === 'season'}
                className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.season && filters.season !== 'all'
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span>{seasonButtonLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65" />
              </button>

              {openMenu === 'season' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 border border-[#0E1113]/15 bg-[#FFFFFF] p-2 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                  {SEASON_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onUpdateFilters((p) => ({ ...p, season: opt.id }));
                        setOpenMenu(null);
                      }}
                      className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        (filters.season ?? 'all') === opt.id
                          ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                          : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Edition Popover (Home / Away / Third / Retro / Limited) */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => togglePopover('edition')}
                aria-expanded={openMenu === 'edition'}
                className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedEdition !== 'all'
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span>
                  {selectedEdition === 'all' ? 'Edition' : selectedEdition}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65" />
              </button>

              {openMenu === 'edition' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 border border-[#0E1113]/15 bg-[#FFFFFF] p-2 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                  {KIT_EDITIONS.map((ed) => (
                    <button
                      key={ed}
                      type="button"
                      onClick={() => {
                        onEditionChange(ed);
                        setOpenMenu(null);
                      }}
                      className={`block w-full px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        selectedEdition === ed
                          ? 'bg-[#FAF9F6] font-semibold text-[#C8232C]'
                          : 'text-[#0E1113] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {ed === 'all'
                        ? 'All Editions (Home / Away / Third)'
                        : ed === 'Retro' || ed === 'Limited Edition'
                          ? ed
                          : `${ed} Kit`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Brand Popover */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => togglePopover('brand')}
                aria-expanded={openMenu === 'brand'}
                className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.brands.length > 0
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span>
                  Brand{filters.brands.length > 0 ? ` (${filters.brands.length})` : ''}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65" />
              </button>

              {openMenu === 'brand' && (
                <div className="absolute left-0 top-full mt-1.5 w-48 border border-[#0E1113]/15 bg-[#FFFFFF] p-2.5 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30 space-y-1">
                  {KIT_BRANDS.map((brand) => {
                    const checked = filters.brands.includes(brand);
                    return (
                      <label
                        key={brand}
                        className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-[#0E1113] hover:bg-[#FAF9F6] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBrand(brand)}
                          className="h-3.5 w-3.5 accent-[#0E1113]"
                        />
                        <span>{brand}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Size Popover with EU Sizing Equivalents */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => togglePopover('size')}
                aria-expanded={openMenu === 'size'}
                className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.sizeFilter
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span>
                  {filters.sizeFilter
                    ? `${filters.sizeFilter} · ${JERSEY_EU_SIZE_MAP[filters.sizeFilter] ?? ''}`
                    : 'Size (EU)'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65" />
              </button>

              {openMenu === 'size' && (
                <div className="absolute left-0 top-full mt-1.5 w-64 border border-[#0E1113]/15 bg-[#FFFFFF] p-3 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                  <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#5F625C]">
                    European Kit Sizing (S–XXL)
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {KIT_SIZES.map((sz) => {
                      const active = filters.sizeFilter === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            onUpdateFilters((p) => ({
                              ...p,
                              sizeFilter: active ? undefined : sz,
                            }));
                            setOpenMenu(null);
                          }}
                          className={`flex items-center justify-between border px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                            active
                              ? 'border-[#0E1113] bg-[#0E1113] text-white'
                              : 'border-[#0E1113]/15 text-[#0E1113] hover:border-[#0E1113]'
                          }`}
                        >
                          <span className="font-bold">{sz}</span>
                          <span className="text-[10.5px] opacity-75">
                            {JERSEY_EU_SIZE_MAP[sz]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Price Popover */}
            <div className="relative hidden xl:block">
              <button
                type="button"
                onClick={() => togglePopover('price')}
                aria-expanded={openMenu === 'price'}
                className={`inline-flex h-9 items-center gap-1.5 border px-3 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.maxPrice < 300
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span>
                  {filters.maxPrice < 300 ? `Under $${filters.maxPrice}` : 'Price'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-65" />
              </button>

              {openMenu === 'price' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 border border-[#0E1113]/15 bg-[#FFFFFF] p-3.5 shadow-[0_16px_36px_rgba(14,17,19,0.10)] z-30">
                  <div className="flex items-center justify-between font-mono text-xs text-[#0E1113]">
                    <span>Max Price</span>
                    <span className="font-semibold">${filters.maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={5}
                    value={filters.maxPrice}
                    onChange={(e) =>
                      onUpdateFilters((p) => ({
                        ...p,
                        maxPrice: Number(e.target.value),
                      }))
                    }
                    className="mt-2.5 w-full accent-[#0E1113]"
                  />
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-[#5F625C]">
                    <span>$30</span>
                    <span>$150</span>
                    <span>$300</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Grid Density + Sort Selector */}
          <div className="flex items-center gap-2.5">
            <span className="2xl:hidden font-mono text-[11px] tabular-nums text-[#5F625C]">
              {itemCount} items
            </span>

            <div
              className="hidden sm:flex items-center border border-[#0E1113]/15"
              role="group"
              aria-label="Kit grid columns"
            >
              {(
                [
                  { id: 2 as GridDensity, icon: Grid2x2, label: '2 columns' },
                  { id: 3 as GridDensity, icon: LayoutGrid, label: '3 columns' },
                  { id: 4 as GridDensity, icon: Grid3x3, label: '4 columns' },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onDensityChange(id)}
                  aria-label={label}
                  aria-pressed={gridDensity === id}
                  className={`flex h-9 w-9 items-center justify-center transition-colors cursor-pointer ${
                    gridDensity === id
                      ? 'bg-[#0E1113] text-white'
                      : 'bg-[#FFFFFF] text-[#5F625C] hover:text-[#0E1113]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <label className="inline-flex h-9 items-center gap-2 border border-[#0E1113]/15 bg-[#FFFFFF] px-3 text-xs text-[#5F625C]">
              <span className="hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                aria-label="Sort kits"
                className="bg-transparent font-medium text-[#0E1113] focus:outline-none cursor-pointer"
              >
                <option value="featured">Recommended</option>
                <option value="best-sellers">Best Sellers</option>
                <option value="newest">New Arrivals</option>
                <option value="rating-desc">Top Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </label>
          </div>
        </div>

        {/* Clean Unboxed Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#0E1113]/8 pt-2.5">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1.5 border border-[#0E1113]/15 bg-[#FAF9F6] px-2.5 py-1 text-[11px] text-[#0E1113] hover:border-[#0E1113] transition-colors cursor-pointer"
              >
                <span>{chip.label}</span>
                <X className="h-3 w-3 opacity-65" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetAll}
              className="ml-1 text-[11px] font-medium text-[#5F625C] underline underline-offset-4 hover:text-[#0E1113] cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

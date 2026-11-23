import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ChevronRight,
  Grid2x2,
  Grid3x3,
  LayoutGrid,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS } from '../data/catalog';
import { COLLECTION_BY_SLUG } from '../data/editorial';
import { useStore } from '../context/StoreContext';
import type {
  BranchId,
  F1GarmentType,
  GridDensity,
  KitEditionType,
  LeagueId,
  NationalRegion,
  SortOption,
  SurfaceType,
} from '../types/store';
import {
  F1_TEAMS,
  filterAndSortProducts,
  filterKitsByEdition,
  formatJerseySizeWithEu,
  formatUsd,
  isKitCollectionView,
  JERSEY_EU_SIZE_MAP,
  NATIONAL_TEAM_REGIONS,
  SEASON_FILTER_OPTIONS,
} from '../utils/commerce';
import { SORT_OPTION_LABELS } from '../utils/router';
import {
  buildListingTransitionKey,
  getListingSkeletonCount,
} from '../utils/skeletons';
import { runWithViewTransition } from '../hooks/useViewTransition';
import { useTransitionSkeleton } from '../hooks/useTransitionSkeleton';
import {
  KitFilterBar,
  KitProductCard,
  ProductCard,
  ProductGridSkeleton,
} from '../components/product';

const SURFACES: SurfaceType[] = ['FG', 'AG', 'TF', 'MG'];
const JERSEY_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const BOOT_EU_SIZES = ['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 42.5', 'EU 43', 'EU 44', 'EU 45'];
const LEAGUES: Array<{ id: LeagueId | 'all'; label: string }> = [
  { id: 'all', label: 'All Leagues' },
  { id: 'La Liga', label: 'La Liga (Spain)' },
  { id: 'Premier League', label: 'Premier League (England)' },
  { id: 'Serie A', label: 'Serie A (Italy)' },
  { id: 'Bundesliga', label: 'Bundesliga (Germany)' },
  { id: 'Ligue 1', label: 'Ligue 1 (France)' },
  { id: 'Cambodian Premier League', label: 'Cambodia CPL' },
  { id: 'International', label: 'National Teams' },
];

interface ShopPageProps {
  collectionSlug?: string;
}

const ITEMS_PER_PAGE = 12;

export function ShopPage({ collectionSlug }: ShopPageProps) {
  const {
    catalog,
    categories,
    branches,
    filters,
    setFilters,
    resetFilters,
    sortBy,
    setSortBy,
    gridDensity,
    setGridDensity,
    navigate,
    navigateToShop,
  } = useStore();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState<'all' | KitEditionType>('all');
  const [kitGridDensity, setKitGridDensity] = useState<GridDensity>(4);
  const [page, setPage] = useState(1);

  const allBrands = Array.from(new Set(catalog.map((p) => p.brand))).sort();

  const collectionMeta = collectionSlug
    ? COLLECTION_BY_SLUG.get(collectionSlug)
    : undefined;

  const isKitMode = isKitCollectionView(filters.category, collectionSlug);

  const baseResults = useMemo(
    () => filterAndSortProducts(catalog, filters, sortBy),
    [catalog, filters, sortBy],
  );
  const results = useMemo(
    () =>
      isKitMode
        ? filterKitsByEdition(baseResults, selectedEdition)
        : baseResults,
    [baseResults, isKitMode, selectedEdition],
  );
  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedResults = results.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const prefersReducedMotion = Boolean(useReducedMotion());
  const listingTransitionKey = useMemo(
    () =>
      buildListingTransitionKey({
        collectionSlug,
        filters,
        selectedEdition,
        sortBy,
        page: safePage,
      }),
    [collectionSlug, filters, selectedEdition, sortBy, safePage],
  );
  const isListingLoading = useTransitionSkeleton(listingTransitionKey, 260);
  const skeletonCardCount = getListingSkeletonCount(
    isKitMode ? kitGridDensity : gridDensity,
    isKitMode,
    pagedResults.length,
  );

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, collectionSlug, selectedEdition]);

  const handleResetAllFilters = () => {
    setSelectedEdition('all');
    setSortBy('featured');
    resetFilters();
    if (collectionMeta?.preset) {
      setFilters((prev) => ({
        ...prev,
        ...collectionMeta.preset,
      }));
    } else if (isKitMode) {
      const currentCategory = filters.category;
      setFilters((prev) => ({
        ...prev,
        category: currentCategory,
      }));
    }
  };

  const toggleSurface = (surface: SurfaceType) => {
    setFilters((prev) => ({
      ...prev,
      surfaces: prev.surfaces.includes(surface)
        ? prev.surfaces.filter((s) => s !== surface)
        : [...prev.surfaces, surface],
    }));
  };

  const toggleBrand = (brand: string) => {
    setFilters((prev) => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter((b) => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const handleDensityChange = (density: GridDensity) => {
    runWithViewTransition(() => setGridDensity(density));
  };

  const activeFilterChips: Array<{ label: string; onClear: () => void }> = [
    ...filters.surfaces.map((s) => ({
      label: `Surface: ${s}`,
      onClear: () => toggleSurface(s),
    })),
    ...filters.brands.map((b) => ({
      label: `Brand: ${b}`,
      onClear: () => toggleBrand(b),
    })),
    ...(filters.league !== 'all'
      ? [
          {
            label: `League: ${filters.league === 'International' ? 'National Teams' : filters.league}`,
            onClear: () =>
              setFilters((p) => ({
                ...p,
                league: 'all',
                nationalRegion: 'all',
              })),
          },
        ]
      : []),
    ...(filters.nationalRegion && filters.nationalRegion !== 'all'
      ? [
          {
            label: `Region: ${filters.nationalRegion}`,
            onClear: () => setFilters((p) => ({ ...p, nationalRegion: 'all' })),
          },
        ]
      : []),
    ...(filters.season && filters.season !== 'all'
      ? [
          {
            label: `Season: ${
              filters.season === 'retro-archive' ? 'Retro Archive' : filters.season
            }`,
            onClear: () => setFilters((p) => ({ ...p, season: 'all' })),
          },
        ]
      : []),
    ...(filters.uclOnly
      ? [
          {
            label: 'UEFA Champions League',
            onClear: () => setFilters((p) => ({ ...p, uclOnly: false })),
          },
        ]
      : []),
    ...(filters.retroOnly
      ? [
          {
            label: 'Retro Archive',
            onClear: () => setFilters((p) => ({ ...p, retroOnly: false })),
          },
        ]
      : []),
    ...(filters.limitedEditionOnly
      ? [
          {
            label: 'Limited Edition',
            onClear: () => setFilters((p) => ({ ...p, limitedEditionOnly: false })),
          },
        ]
      : []),
    ...(filters.bestSellersOnly
      ? [
          {
            label: 'Best Sellers',
            onClear: () => setFilters((p) => ({ ...p, bestSellersOnly: false })),
          },
        ]
      : []),
    ...(filters.newArrivalsOnly
      ? [
          {
            label: 'New Arrivals',
            onClear: () => setFilters((p) => ({ ...p, newArrivalsOnly: false })),
          },
        ]
      : []),
    ...(filters.f1GarmentType && filters.f1GarmentType !== 'all'
      ? [
          {
            label:
              filters.f1GarmentType === 'jacket'
                ? 'F1 Paddock Jackets'
                : 'F1 Team Jerseys',
            onClear: () => setFilters((p) => ({ ...p, f1GarmentType: 'all' })),
          },
        ]
      : []),
    ...(filters.f1Team && filters.f1Team !== 'all'
      ? [
          {
            label: `F1 Team: ${filters.f1Team}`,
            onClear: () => setFilters((p) => ({ ...p, f1Team: 'all' })),
          },
        ]
      : []),
    ...(filters.ballSubcategory && filters.ballSubcategory !== 'all'
      ? [
          {
            label: `Balls: ${
              filters.ballSubcategory === 'fifa-pro'
                ? 'FIFA Quality Pro'
                : filters.ballSubcategory === 'league'
                  ? 'UCL & League'
                  : 'Indoor Futsal'
            }`,
            onClear: () => setFilters((p) => ({ ...p, ballSubcategory: 'all' })),
          },
        ]
      : []),
    ...(filters.essentialsSubcategory && filters.essentialsSubcategory !== 'all'
      ? [
          {
            label: `Essentials: ${
              filters.essentialsSubcategory === 'gloves'
                ? 'GK Gloves'
                : filters.essentialsSubcategory === 'socks'
                  ? 'Grip Socks'
                  : 'Shin Guards'
            }`,
            onClear: () => setFilters((p) => ({ ...p, essentialsSubcategory: 'all' })),
          },
        ]
      : []),
    ...(filters.signatureBootOnly
      ? [
          {
            label: 'Messi & Signature Boots',
            onClear: () => setFilters((p) => ({ ...p, signatureBootOnly: false })),
          },
        ]
      : []),
    ...(filters.branch !== 'all'
      ? [
          {
            label: `Branch: ${branches.find((b) => b.id === filters.branch)?.shortName ?? filters.branch}`,
            onClear: () => setFilters((p) => ({ ...p, branch: 'all' })),
          },
        ]
      : []),
    ...(filters.customizableOnly
      ? [
          {
            label: 'Custom Print Ready',
            onClear: () => setFilters((p) => ({ ...p, customizableOnly: false })),
          },
        ]
      : []),
    ...(filters.saleOnly
      ? [
          {
            label: 'On Sale',
            onClear: () => setFilters((p) => ({ ...p, saleOnly: false })),
          },
        ]
      : []),
    ...(filters.maxPrice < 300
      ? [
          {
            label: `Max ${formatUsd(filters.maxPrice)}`,
            onClear: () => setFilters((p) => ({ ...p, maxPrice: 300 })),
          },
        ]
      : []),
    ...(selectedEdition !== 'all'
      ? [
          {
            label: `Edition: ${selectedEdition}`,
            onClear: () => setSelectedEdition('all'),
          },
        ]
      : []),
    ...(filters.sizeFilter
      ? [
          {
            label: `Size: ${formatJerseySizeWithEu(filters.sizeFilter)}`,
            onClear: () => setFilters((p) => ({ ...p, sizeFilter: undefined })),
          },
        ]
      : []),
    ...(filters.searchQuery.trim()
      ? [
          {
            label: `"${filters.searchQuery.trim()}"`,
            onClear: () => setFilters((p) => ({ ...p, searchQuery: '' })),
          },
        ]
      : []),
    ...(sortBy !== 'featured'
      ? [
          {
            label: `Sort: ${SORT_OPTION_LABELS[sortBy]}`,
            onClear: () => setSortBy('featured'),
          },
        ]
      : []),
  ];

  const activeFilterCount = activeFilterChips.length;

  const gridColsClass =
    gridDensity === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : gridDensity === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  const showNationalRegionStrip =
    (filters.category === 'jerseys' || filters.category === 'all') &&
    (filters.league === 'International' ||
      Boolean(filters.nationalRegion && filters.nationalRegion !== 'all'));

  const clearSubcategoryPreservingMain = () =>
    setFilters((prev) => ({
      ...prev,
      league: 'all',
      nationalRegion: 'all',
      uclOnly: false,
      retroOnly: false,
      limitedEditionOnly: false,
      bestSellersOnly: false,
      newArrivalsOnly: false,
      surfaces: [],
      signatureBootOnly: false,
      f1GarmentType: 'all',
      f1Team: 'all',
      ballSubcategory: 'all',
      essentialsSubcategory: 'all',
      saleOnly: false,
    }));

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Curated Collections & Special Editions */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          Curated Drops &amp; Editions
        </h3>
        <div className="mt-2.5 space-y-2">
          <label className="flex items-center justify-between gap-2 border border-[#0E1113]/12 bg-white px-3 py-2 cursor-pointer hover:border-[#0E1113]">
            <span className="text-xs font-semibold text-[#0E1113]">Best Sellers</span>
            <input
              type="checkbox"
              checked={Boolean(filters.bestSellersOnly)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, bestSellersOnly: e.target.checked }))
              }
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 border border-[#0E1113]/12 bg-white px-3 py-2 cursor-pointer hover:border-[#0E1113]">
            <span className="text-xs font-semibold text-[#0E1113]">New Arrivals</span>
            <input
              type="checkbox"
              checked={Boolean(filters.newArrivalsOnly)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, newArrivalsOnly: e.target.checked }))
              }
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 border border-[#0E1113]/12 bg-white px-3 py-2 cursor-pointer hover:border-[#0E1113]">
            <span className="text-xs font-semibold text-[#0E1113]">Retro Archive Kits</span>
            <input
              type="checkbox"
              checked={Boolean(filters.retroOnly)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  retroOnly: e.target.checked,
                  category: e.target.checked ? 'jerseys' : prev.category,
                }))
              }
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 border border-[#0E1113]/12 bg-white px-3 py-2 cursor-pointer hover:border-[#0E1113]">
            <span className="text-xs font-semibold text-[#B8933B]">Limited Edition</span>
            <input
              type="checkbox"
              checked={Boolean(filters.limitedEditionOnly)}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, limitedEditionOnly: e.target.checked }))
              }
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
          </label>
          <label className="flex items-center justify-between gap-2 border border-[#0E1113]/12 bg-white px-3 py-2 cursor-pointer hover:border-[#0E1113]">
            <span className="text-xs font-semibold text-[#0E1113]">Messi &amp; Signature Boots</span>
            <input
              type="checkbox"
              checked={Boolean(filters.signatureBootOnly)}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  signatureBootOnly: e.target.checked,
                  category: e.target.checked ? 'boots' : prev.category,
                }))
              }
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
          </label>
        </div>
      </div>

      {/* Season Year-Year Filter */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          Season (Year–Year)
        </h3>
        <div className="mt-2.5 space-y-1">
          {SEASON_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  season: opt.id,
                  retroOnly: opt.id === 'retro-archive' ? true : false,
                }))
              }
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                (filters.season ?? 'all') === opt.id
                  ? 'bg-[#0E1113] text-white'
                  : 'bg-white text-[#0E1113] hover:bg-[#EAE7DF]'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* National Teams by Region */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          National Teams by Region
        </h3>
        <p className="mt-1 text-[11px] text-[#5F625C]">
          Europe, South America &amp; Asia / ASEAN kits
        </p>
        <div className="mt-2.5 space-y-1">
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                nationalRegion: 'all',
              }))
            }
            className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
              (filters.nationalRegion ?? 'all') === 'all'
                ? 'bg-[#0E1113] text-white'
                : 'bg-white text-[#0E1113] hover:bg-[#EAE7DF]'
            }`}
          >
            <span>All Regions</span>
          </button>
          {NATIONAL_TEAM_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: 'jerseys',
                  league: 'International',
                  nationalRegion: region.id,
                }))
              }
              className={`flex w-full flex-col px-3 py-2 text-left transition-colors cursor-pointer ${
                filters.nationalRegion === region.id
                  ? 'bg-[#0E1113] text-white'
                  : 'bg-white text-[#0E1113] hover:bg-[#EAE7DF]'
              }`}
            >
              <span className="text-xs font-semibold">{region.label}</span>
              <span
                className={`font-mono text-[10px] ${
                  filters.nationalRegion === region.id
                    ? 'text-white/75'
                    : 'text-[#5F625C]'
                }`}
              >
                {region.countriesHint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 2026/27 Top 5 Leagues & UEFA Champions League */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          Club Leagues &amp; UCL
        </h3>
        <p className="mt-1 text-[11px] text-[#5F625C]">
          Top 5 European leagues, Champions League &amp; Cambodia CPL
        </p>

        <label className="mt-3 flex items-center justify-between gap-2 border border-[#0E1113]/15 bg-white px-3 py-2.5 cursor-pointer hover:border-[#032EA1]">
          <div>
            <span className="block text-xs font-bold text-[#032EA1]">
              UEFA Champions League
            </span>
            <span className="block text-[10.5px] text-[#5F625C]">
              2026/27 UCL kits &amp; match balls
            </span>
          </div>
          <input
            type="checkbox"
            checked={filters.uclOnly}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                uclOnly: e.target.checked,
              }))
            }
            className="h-4 w-4 accent-[#032EA1]"
          />
        </label>

        <div className="mt-2.5 space-y-1">
          {LEAGUES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  league: option.id,
                  nationalRegion: option.id === 'International' ? prev.nationalRegion : 'all',
                  category: option.id === 'all' ? prev.category : 'jerseys',
                }))
              }
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                filters.league === option.id
                  ? 'bg-[#0E1113] text-white'
                  : 'bg-white text-[#0E1113] hover:bg-[#EAE7DF]'
              }`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* F1 Motorsport Constructor & Garment Type */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          F1 Teamwear &amp; Jackets
        </h3>
        <div className="mt-2.5 grid grid-cols-3 gap-1">
          {(
            [
              ['all', 'All F1'],
              ['jersey', 'Jerseys'],
              ['jacket', 'Jackets'],
            ] as Array<[F1GarmentType | 'all', string]>
          ).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: val === 'all' ? prev.category : 'f1',
                  f1GarmentType: val,
                }))
              }
              className={`h-8 border text-[11px] font-semibold transition-colors cursor-pointer ${
                (filters.f1GarmentType ?? 'all') === val
                  ? 'border-[#0E1113] bg-[#0E1113] text-white'
                  : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#0E1113]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {F1_TEAMS.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: 'f1',
                  f1Team: prev.f1Team === team ? 'all' : team,
                }))
              }
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                filters.f1Team === team
                  ? 'bg-[#0E1113] text-white'
                  : 'bg-white text-[#0E1113] hover:bg-[#EAE7DF]'
              }`}
            >
              <span>{team}</span>
            </button>
          ))}
        </div>
      </div>

      {/* European Sizing Filter (Kits & Boots) */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          Size (European Sizing)
        </h3>
        <p className="mt-1 text-[11px] text-[#5F625C]">
          {filters.category === 'boots'
            ? 'Boot sizes EU 39 – EU 45'
            : 'Kit sizes S (EU 46) – XXL (EU 58)'}
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {(filters.category === 'boots' ? BOOT_EU_SIZES : JERSEY_SIZES).map((sz) => {
            const active = filters.sizeFilter === sz;
            const euHint = JERSEY_EU_SIZE_MAP[sz];
            return (
              <button
                key={sz}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    sizeFilter: active ? undefined : sz,
                  }))
                }
                aria-pressed={active}
                className={`flex items-center justify-between border px-2.5 py-1.5 font-mono text-[11px] transition-colors cursor-pointer ${
                  active
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                <span className="font-semibold">{sz}</span>
                {euHint && (
                  <span className={`text-[9.5px] ${active ? 'text-white/75' : 'text-[#5F625C]'}`}>
                    {euHint}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playing Surface */}
      <div className="border-t border-[#0E1113]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#0E1113]">
          Playing Surface (Boots)
        </h3>
        <p className="mt-1 text-[11px] text-[#5F625C]">
          Match your soleplate to Phnom Penh pitches
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SURFACES.map((surface) => {
            const active = filters.surfaces.includes(surface);
            return (
              <button
                key={surface}
                type="button"
                onClick={() => toggleSurface(surface)}
                aria-pressed={active}
                className={`h-9 border px-3 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                {surface}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="border-t border-[#18222D]/10 pt-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="catalog-max-price"
            className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]"
          >
            Max Price
          </label>
          <span className="font-mono text-xs font-bold tabular-nums text-[#032EA1]">
            Up to {formatUsd(filters.maxPrice)}
          </span>
        </div>
        <input
          id="catalog-max-price"
          type="range"
          min={25}
          max={300}
          step={5}
          value={filters.maxPrice}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))
          }
          className="mt-3 w-full accent-[#18222D]"
        />
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-[#56616A]">
          <span>$25</span>
          <span>$150</span>
          <span>$300</span>
        </div>
      </div>

      {/* In-Stock Branch Filter */}
      <div className="border-t border-[#18222D]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
          Phnom Penh Branch Stock
        </h3>
        <div className="mt-3 space-y-1.5">
          {(
            [
              { id: 'all', label: 'All 3 Branches' },
              ...branches.map((b) => ({ id: b.id, label: b.name })),
            ] as Array<{ id: BranchId | 'all'; label: string }>
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, branch: option.id }))
              }
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                filters.branch === option.id
                  ? 'bg-[#18222D] text-white'
                  : 'bg-white text-[#18222D] hover:bg-[#E8EDF2]'
              }`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand Filter */}
      <div className="border-t border-[#18222D]/10 pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
          Brand
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {allBrands.map((brand) => {
            const checked = filters.brands.includes(brand);
            return (
              <label
                key={brand}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-[#18222D] hover:bg-white cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBrand(brand)}
                  className="h-3.5 w-3.5 accent-[#18222D]"
                />
                <span className="truncate">{brand}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Custom Printing, Rating & Availability Facets */}
      <div className="border-t border-[#18222D]/10 pt-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
          Rating &amp; Availability
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {[0, 4.7, 4.8, 4.9].map((minR) => (
            <button
              key={minR}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, minRating: minR }))}
              className={`inline-flex items-center gap-1 border px-2.5 py-1.5 font-mono text-[11px] font-semibold cursor-pointer ${
                (filters.minRating ?? 0) === minR
                  ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                  : 'border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]'
              }`}
            >
              {minR === 0 ? (
                'All Ratings'
              ) : (
                <>
                  <Star className="h-3 w-3 fill-[#B8933B] text-[#B8933B]" />
                  {minR}+
                </>
              )}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-xs font-semibold text-[#18222D]">
            In-Stock Ready Today Only
          </span>
          <input
            type="checkbox"
            checked={Boolean(filters.inStockOnly)}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, inStockOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-[#0E1113]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-xs font-semibold text-[#C8232C]">
            Markdown / On Sale Only
          </span>
          <input
            type="checkbox"
            checked={Boolean(filters.saleOnly)}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, saleOnly: e.target.checked }))
            }
            className="h-4 w-4 accent-[#C8232C]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#18222D]">
              Custom Print Ready
            </span>
            <span className="block text-[11px] text-[#56616A]">
              Football &amp; F1 jerseys only
            </span>
          </div>
          <input
            type="checkbox"
            checked={filters.customizableOnly}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                customizableOnly: e.target.checked,
              }))
            }
            className="h-4 w-4 accent-[#0E1113]"
          />
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={handleResetAllFilters}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#18222D]/20 bg-white text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset All Filters</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="animate-page-enter mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      {/* Dynamic Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase text-[#0E1113]/60"
      >
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          className="hover:text-[#0E1113] cursor-pointer"
        >
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          type="button"
          onClick={() => navigate({ page: 'shop', collectionSlug: 'all' })}
          className="hover:text-[#0E1113] cursor-pointer"
        >
          Collections
        </button>
        {collectionMeta && collectionMeta.slug !== 'all' && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-bold text-[#0E1113]">{collectionMeta.title}</span>
          </>
        )}
      </nav>

      {/* Page Header & SEO Collection Editorial */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#0E1113]/15 pb-6">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#B8933B]">
            {collectionMeta?.eyebrow ?? 'SPORT CASTLE PHNOM PENH ARCHIVE'}
          </p>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#0E1113]">
            {collectionMeta
              ? collectionMeta.title
              : filters.uclOnly && filters.league !== 'all'
                ? `${filters.league} · UEFA Champions League`
                : filters.uclOnly
                  ? 'UEFA Champions League 2026/27 Kits'
                  : filters.league !== 'all'
                    ? `${filters.league} Kits`
                    : CATEGORY_LABELS[filters.category]}
          </h1>
          {collectionMeta && (
            <p className="mt-2 text-sm leading-relaxed text-[#0E1113]/70">
              {collectionMeta.editorialIntro}
            </p>
          )}
        </div>
        <p className="font-mono text-xs tabular-nums text-[#0E1113]/65 shrink-0">
          Showing <strong className="text-[#0E1113]">{results.length}</strong> of{' '}
          {catalog.length} authentic products
        </p>
      </div>

      {/* CLEAN UNIFIED CATEGORY NAVIGATION BAR (Exact counts & clean division mapping) */}
      <nav
        aria-label="Product category directory"
        className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() =>
            navigateToShop({ collectionSlug: 'all', category: 'all' })
          }
          aria-current={filters.category === 'all' ? 'page' : undefined}
          className={`inline-flex h-9 shrink-0 items-center gap-2 border px-3.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            filters.category === 'all' && !filters.uclOnly
              ? 'border-[#0E1113] bg-[#0E1113] text-white'
              : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
          }`}
        >
          <span>All Gear</span>
          <span className="font-mono text-[10.5px] opacity-70">{catalog.length}</span>
        </button>

        {categories.map((cat) => {
          const isActive = filters.category === cat.id && !filters.uclOnly;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                navigateToShop({ collectionSlug: cat.slug, category: cat.id })
              }
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-2 border px-3.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#0E1113] bg-[#0E1113] text-white'
                  : 'border-[#0E1113]/15 bg-[#FFFFFF] text-[#0E1113] hover:border-[#0E1113]'
              }`}
            >
              <span>{cat.name}</span>
              <span className="font-mono text-[10.5px] opacity-70">
                {cat.productCount}
              </span>
            </button>
          );
        })}
      </nav>

      {/* HIERARCHICAL SUB-CATEGORY DIRECTORY (Adapts cleanly per main category) */}
      <div
        aria-label="Sub-category filters"
        className="mt-2.5 border-y border-[#0E1113]/10 bg-[#FAF9F6] px-3 py-2.5"
      >
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F625C] pr-1">
            Sub-Categories
          </span>

          {filters.category === 'all' && (
            <>
              {(
                [
                  {
                    label: 'Best Sellers',
                    active: Boolean(filters.bestSellersOnly),
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        bestSellersOnly: !p.bestSellersOnly,
                      })),
                  },
                  {
                    label: 'New Arrivals',
                    active: Boolean(filters.newArrivalsOnly),
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        newArrivalsOnly: !p.newArrivalsOnly,
                      })),
                  },
                  {
                    label: 'National Teams',
                    active: filters.league === 'International',
                    onClick: () =>
                      navigateToShop({
                        collectionSlug: 'national-teams',
                        category: 'jerseys',
                        league: 'International',
                      }),
                  },
                  {
                    label: 'Retro Archive',
                    active: Boolean(filters.retroOnly),
                    onClick: () =>
                      navigateToShop({
                        collectionSlug: 'retro-jerseys',
                        category: 'jerseys',
                        retroOnly: true,
                      }),
                  },
                  {
                    label: 'Limited Edition',
                    active: Boolean(filters.limitedEditionOnly),
                    onClick: () =>
                      navigateToShop({
                        collectionSlug: 'limited-edition',
                        category: 'all',
                        limitedEditionOnly: true,
                      }),
                  },
                  {
                    label: 'Messi & Signature Boots',
                    active: Boolean(filters.signatureBootOnly),
                    onClick: () =>
                      navigateToShop({
                        collectionSlug: 'football-boots',
                        category: 'boots',
                        signatureBootOnly: true,
                      }),
                  },
                  {
                    label: 'F1 Paddock Jackets',
                    active: filters.f1GarmentType === 'jacket',
                    onClick: () =>
                      navigateToShop({
                        collectionSlug: 'f1-jackets',
                        category: 'f1',
                        f1GarmentType: 'jacket',
                      }),
                  },
                  {
                    label: 'On Sale',
                    active: Boolean(filters.saleOnly),
                    onClick: () =>
                      setFilters((p) => ({ ...p, saleOnly: !p.saleOnly })),
                  },
                ]
              ).map((sub) => (
                <button
                  key={sub.label}
                  type="button"
                  onClick={sub.onClick}
                  aria-pressed={sub.active}
                  className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    sub.active
                      ? 'border-[#0E1113] bg-[#0E1113] text-white'
                      : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </>
          )}

          {filters.category === 'jerseys' && (
            <>
              {(
                [
                  {
                    label: 'All Jerseys',
                    active:
                      filters.league === 'all' &&
                      !filters.uclOnly &&
                      !filters.retroOnly &&
                      !filters.limitedEditionOnly &&
                      (filters.nationalRegion ?? 'all') === 'all',
                    onClick: clearSubcategoryPreservingMain,
                  },
                  {
                    label: 'National Teams',
                    active:
                      filters.league === 'International' ||
                      Boolean(filters.nationalRegion && filters.nationalRegion !== 'all'),
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'International',
                        uclOnly: false,
                        retroOnly: false,
                        limitedEditionOnly: false,
                      })),
                  },
                  {
                    label: 'UEFA Champions League',
                    active: filters.uclOnly,
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        uclOnly: !p.uclOnly,
                        league: 'all',
                        nationalRegion: 'all',
                      })),
                  },
                  {
                    label: 'La Liga',
                    active: filters.league === 'La Liga',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'La Liga',
                        nationalRegion: 'all',
                        uclOnly: false,
                        retroOnly: false,
                      })),
                  },
                  {
                    label: 'Premier League',
                    active: filters.league === 'Premier League',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'Premier League',
                        nationalRegion: 'all',
                        uclOnly: false,
                        retroOnly: false,
                      })),
                  },
                  {
                    label: 'Serie A',
                    active: filters.league === 'Serie A',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'Serie A',
                        nationalRegion: 'all',
                        uclOnly: false,
                      })),
                  },
                  {
                    label: 'Bundesliga',
                    active: filters.league === 'Bundesliga',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'Bundesliga',
                        nationalRegion: 'all',
                        uclOnly: false,
                      })),
                  },
                  {
                    label: 'Ligue 1',
                    active: filters.league === 'Ligue 1',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'Ligue 1',
                        nationalRegion: 'all',
                        uclOnly: false,
                      })),
                  },
                  {
                    label: 'Cambodia CPL',
                    active: filters.league === 'Cambodian Premier League',
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        league: 'Cambodian Premier League',
                        nationalRegion: 'all',
                        uclOnly: false,
                      })),
                  },
                  {
                    label: 'Retro Archive',
                    active: Boolean(filters.retroOnly),
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        retroOnly: !p.retroOnly,
                        league: 'all',
                        nationalRegion: 'all',
                      })),
                  },
                  {
                    label: 'Limited Edition',
                    active: Boolean(filters.limitedEditionOnly),
                    onClick: () =>
                      setFilters((p) => ({
                        ...p,
                        limitedEditionOnly: !p.limitedEditionOnly,
                      })),
                  },
                ]
              ).map((sub) => (
                <button
                  key={sub.label}
                  type="button"
                  onClick={sub.onClick}
                  aria-pressed={sub.active}
                  className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    sub.active
                      ? 'border-[#0E1113] bg-[#0E1113] text-white'
                      : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </>
          )}

          {filters.category === 'boots' && (
            <>
              <button
                type="button"
                onClick={clearSubcategoryPreservingMain}
                aria-pressed={filters.surfaces.length === 0 && !filters.signatureBootOnly}
                className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.surfaces.length === 0 && !filters.signatureBootOnly
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                All Boots
              </button>
              {(
                [
                  ['FG', 'FG Natural Grass'],
                  ['AG', 'AG Artificial Grass'],
                  ['TF', 'TF Studded Turf'],
                  ['MG', 'MG Multi-Ground'],
                ] as Array<[SurfaceType, string]>
              ).map(([surfaceCode, label]) => {
                const active =
                  filters.surfaces.length === 1 && filters.surfaces[0] === surfaceCode;
                return (
                  <button
                    key={surfaceCode}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        surfaces: active ? [] : [surfaceCode],
                        signatureBootOnly: false,
                      }))
                    }
                    aria-pressed={active}
                    className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    surfaces: [],
                    signatureBootOnly: !p.signatureBootOnly,
                  }))
                }
                aria-pressed={Boolean(filters.signatureBootOnly)}
                className={`h-8 shrink-0 border px-3 text-[11.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filters.signatureBootOnly
                    ? 'border-[#B8933B] bg-[#0E1113] text-[#B8933B]'
                    : 'border-[#B8933B]/45 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                Messi &amp; Signature Edition
              </button>
            </>
          )}

          {filters.category === 'f1' && (
            <>
              <button
                type="button"
                onClick={clearSubcategoryPreservingMain}
                aria-pressed={
                  (filters.f1GarmentType ?? 'all') === 'all' &&
                  (filters.f1Team ?? 'all') === 'all'
                }
                className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  (filters.f1GarmentType ?? 'all') === 'all' &&
                  (filters.f1Team ?? 'all') === 'all'
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                All F1 Paddock
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    f1GarmentType: p.f1GarmentType === 'jersey' ? 'all' : 'jersey',
                  }))
                }
                aria-pressed={filters.f1GarmentType === 'jersey'}
                className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.f1GarmentType === 'jersey'
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                Team Jerseys (2 Colors/Team)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    f1GarmentType: p.f1GarmentType === 'jacket' ? 'all' : 'jacket',
                  }))
                }
                aria-pressed={filters.f1GarmentType === 'jacket'}
                className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filters.f1GarmentType === 'jacket'
                    ? 'border-[#0E1113] bg-[#0E1113] text-white'
                    : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                Official Paddock Jackets
              </button>
              <span className="h-4 w-px bg-[#0E1113]/15 shrink-0" aria-hidden="true" />
              {F1_TEAMS.map((team) => {
                const active = filters.f1Team === team;
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({
                        ...p,
                        f1Team: active ? 'all' : team,
                      }))
                    }
                    aria-pressed={active}
                    className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    {team}
                  </button>
                );
              })}
            </>
          )}

          {filters.category === 'balls' && (
            <>
              {(
                [
                  ['all', 'All Match Balls'],
                  ['fifa-pro', 'FIFA Quality Pro (Size 5)'],
                  ['league', 'UCL & League Official'],
                  ['futsal', 'Indoor Futsal (Size 4)'],
                ] as const
              ).map(([code, label]) => {
                const active = (filters.ballSubcategory ?? 'all') === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({ ...p, ballSubcategory: code }))
                    }
                    aria-pressed={active}
                    className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </>
          )}

          {filters.category === 'essentials' && (
            <>
              {(
                [
                  ['all', 'All Essentials'],
                  ['gloves', 'Goalkeeper Gloves'],
                  ['socks', 'Anti-Slip Grip Socks'],
                  ['protection', 'Shin Guards'],
                ] as const
              ).map(([code, label]) => {
                const active = (filters.essentialsSubcategory ?? 'all') === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      setFilters((p) => ({ ...p, essentialsSubcategory: code }))
                    }
                    aria-pressed={active}
                    className={`h-8 shrink-0 border px-3 text-[11.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#0E1113] bg-[#0E1113] text-white'
                        : 'border-[#0E1113]/12 bg-white text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Nested National Team Confederation / Region Strip */}
        {showNationalRegionStrip && (
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto border-t border-[#0E1113]/10 pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#032EA1] pr-1">
              National Team Region
            </span>
            <button
              type="button"
              onClick={() =>
                setFilters((p) => ({
                  ...p,
                  league: 'International',
                  nationalRegion: 'all',
                }))
              }
              aria-pressed={(filters.nationalRegion ?? 'all') === 'all'}
              className={`h-7 shrink-0 border px-2.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                (filters.nationalRegion ?? 'all') === 'all'
                  ? 'border-[#032EA1] bg-[#032EA1] text-white'
                  : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#032EA1]'
              }`}
            >
              All Nations
            </button>
            {NATIONAL_TEAM_REGIONS.map((region) => {
              const active = filters.nationalRegion === region.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      category: 'jerseys',
                      league: 'International',
                      nationalRegion: region.id as NationalRegion,
                    }))
                  }
                  aria-pressed={active}
                  className={`h-7 shrink-0 border px-2.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#032EA1] bg-[#032EA1] text-white'
                      : 'border-[#0E1113]/15 bg-white text-[#0E1113] hover:border-[#032EA1]'
                  }`}
                >
                  <span className="font-semibold">{region.label}</span>
                  <span
                    className={`ml-1.5 font-mono text-[10px] ${
                      active ? 'text-white/80' : 'text-[#5F625C]'
                    }`}
                  >
                    ({region.countriesHint})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MINIMALIST KIT ATELIER PLP MODE (Applied strictly to Jerseys & Kits) */}
      {isKitMode ? (
        <div className="mt-6">
          {/* Full-bleed sticky Zando-style single-row filter bar */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-10">
            <KitFilterBar
              title={
                collectionMeta?.title ??
                (filters.uclOnly
                  ? '2026/27 UEFA Champions League Kits'
                  : filters.league !== 'all'
                    ? `${filters.league} Kits`
                    : CATEGORY_LABELS[filters.category])
              }
              itemCount={results.length}
              filters={filters}
              selectedEdition={selectedEdition}
              onEditionChange={setSelectedEdition}
              sortBy={sortBy}
              gridDensity={kitGridDensity}
              onUpdateFilters={setFilters}
              onSortChange={setSortBy}
              onDensityChange={(d) => runWithViewTransition(() => setKitGridDensity(d))}
              onOpenDrawer={() => setMobileFiltersOpen(true)}
              onResetAll={handleResetAllFilters}
              activeChips={activeFilterChips}
            />
          </div>

          <div className="mt-8">
            {isListingLoading ? (
              <ProductGridSkeleton
                variant="kit"
                count={skeletonCardCount}
                gridDensity={kitGridDensity}
              />
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-[#0E1113]/10 bg-[#FAF9F6] px-6 py-20 text-center">
                <p className="font-display text-2xl font-bold uppercase text-[#0E1113]">
                  No kits match your current selection
                </p>
                <p className="mt-2 max-w-md text-sm text-[#5F625C]">
                  Reset your competition, edition, or size filters to browse all authentic 2026/27 jerseys and F1 paddock shirts.
                </p>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-6 inline-flex h-11 items-center gap-2 bg-[#0E1113] px-6 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-[#C8232C] transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <>
                <motion.div
                  key={listingTransitionKey}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className={`grid gap-x-5 gap-y-10 ${
                    kitGridDensity === 2
                      ? 'grid-cols-2'
                      : kitGridDensity === 3
                        ? 'grid-cols-2 md:grid-cols-3'
                        : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  }`}
                >
                  {pagedResults.map((product, idx) => (
                    <KitProductCard
                      key={product.id}
                      product={product}
                      priority={idx < 4}
                    />
                  ))}
                </motion.div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#0E1113]/12 pt-6">
                    <p className="font-mono text-xs text-[#5F625C]">
                      Page {safePage} of {totalPages} · {results.length} kits
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => {
                          setPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="h-9 border border-[#0E1113]/15 px-3.5 font-mono text-xs text-[#0E1113] disabled:opacity-35 hover:border-[#0E1113] cursor-pointer disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setPage(n);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`h-9 w-9 border font-mono text-xs transition-colors cursor-pointer ${
                            safePage === n
                              ? 'border-[#0E1113] bg-[#0E1113] text-white'
                              : 'border-[#0E1113]/15 text-[#0E1113] hover:border-[#0E1113]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => {
                          setPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="h-9 border border-[#0E1113]/15 px-3.5 font-mono text-xs text-[#0E1113] disabled:opacity-35 hover:border-[#0E1113] cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* STANDARD TECHNICAL TOOLBAR & SIDEBAR (Boots, Balls, Essentials, Master Catalog) */}
          <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#5F625C]">
              Technical Hardware &amp; Multi-Surface Filtering
            </p>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#56616A]" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                  }
                  placeholder="Filter boots, kits, F1..."
                  aria-label="Filter catalog by keyword"
                  className="h-10 w-full rounded-md border border-[#18222D]/15 bg-white pl-9 pr-8 text-xs text-[#18222D] focus:border-[#18222D] focus:outline-none"
                />
                {filters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#56616A] hover:text-[#18222D] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="h-10 rounded-md border border-[#18222D]/15 bg-white px-3 text-xs font-medium text-[#18222D] focus:border-[#18222D] focus:outline-none cursor-pointer"
              >
                <option value="featured">Sort: Featured</option>
                <option value="best-sellers">Best Sellers</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Top Rated</option>
                <option value="weight-asc">Lightest Weight First</option>
              </select>

              {/* Desktop Grid Density Morph Toggle */}
              <div
                className="hidden xl:inline-flex items-center rounded-md border border-[#18222D]/15 bg-white p-0.5"
                role="group"
                aria-label="Grid column density"
              >
                {(
                  [
                    [2, '2 columns', Grid2x2],
                    [3, '3 columns', Grid3x3],
                    [4, '4 columns', LayoutGrid],
                  ] as Array<[GridDensity, string, typeof Grid3x3]>
                ).map(([cols, label, Icon]) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => handleDensityChange(cols)}
                    aria-label={label}
                    aria-pressed={gridDensity === cols}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors cursor-pointer ${
                      gridDensity === cols
                        ? 'bg-[#18222D] text-white'
                        : 'text-[#56616A] hover:text-[#18222D]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#18222D]/20 bg-white px-3.5 text-xs font-semibold text-[#18222D] lg:hidden cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Removable Active Filter Chips Bar */}
          {activeFilterChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.onClear}
                  className="inline-flex items-center gap-1.5 rounded border border-[#18222D]/20 bg-white px-2.5 py-1 text-xs font-medium text-[#18222D] hover:border-[#D81E2B] hover:text-[#D81E2B] transition-colors cursor-pointer"
                >
                  <span>{chip.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="ml-1 text-xs font-semibold text-[#032EA1] hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main Content Layout: Desktop Sidebar + Product Grid */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 rounded-lg border border-[#18222D]/8 bg-[#F5F7F8] p-5">
                {filterSidebarContent}
              </div>
            </aside>

            <div className="lg:col-span-9">
              {isListingLoading ? (
                <ProductGridSkeleton
                  variant="technical"
                  count={skeletonCardCount}
                  gridDensity={gridDensity}
                />
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-[#18222D]/10 bg-white px-6 py-16 text-center">
                  <p className="font-display text-lg font-bold text-[#18222D]">
                    No gear matches your current filters
                  </p>
                  <p className="mt-1 max-w-md text-sm text-[#56616A]">
                    Try clearing a surface filter or raising your maximum price range to see all available Phnom Penh stock.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#18222D] px-5 text-xs font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              ) : (
                <>
                  <motion.div
                    key={listingTransitionKey}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className={`grid gap-6 ${gridColsClass}`}
                  >
                    {pagedResults.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </motion.div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#0E1113]/15 pt-6">
                  <p className="font-mono text-xs text-[#0E1113]/60">
                    Page {safePage} of {totalPages} · {results.length} results
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="border border-[#0E1113]/20 bg-[#FDFCF9] px-3.5 py-2 font-mono text-xs font-bold uppercase disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setPage(num);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`h-9 w-9 font-mono text-xs font-bold cursor-pointer ${
                          num === safePage
                            ? 'bg-[#0E1113] text-[#FDFCF9]'
                            : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => {
                        setPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="border border-[#0E1113]/20 bg-[#FDFCF9] px-3.5 py-2 font-mono text-xs font-bold uppercase disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </>
      )}

      {/* Filter Slide-Over Drawer (Mobile on standard views; Desktop + Mobile on Minimalist Kit views) */}
      {mobileFiltersOpen && (
        <div
          className={`fixed inset-0 z-50 flex justify-end ${isKitMode ? '' : 'lg:hidden'}`}
          role="dialog"
          aria-modal="true"
          aria-label="Filter products"
        >
          <div
            className="animate-overlay-fade fixed inset-0 bg-[#0B0D10]/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="animate-drawer-right relative z-10 flex h-full w-full max-w-xs flex-col bg-[#F5F7F8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#18222D]/10 bg-white px-5 py-4">
              <h2 className="font-display text-base font-bold text-[#18222D]">
                Filter Gear
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1 text-[#56616A] hover:text-[#18222D] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{filterSidebarContent}</div>
            <div className="border-t border-[#18222D]/10 bg-white p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="h-11 w-full rounded-md bg-[#18222D] text-xs font-semibold text-white cursor-pointer"
              >
                Show {results.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

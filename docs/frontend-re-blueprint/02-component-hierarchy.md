# 02 — Component Hierarchy & TypeScript Contracts
**Scope:** Minimalist Jersey & Kit UI Architecture (applied exclusively to `category === 'jerseys' | 'f1'` across Home, PLP, and PDP while preserving dedicated footwear/gear components).

---

## 1. Atomic Component Tree

```text
AppShell
├── Navbar (Scroll-aware sticky header, MegaMenuPanel, Predictive Search trigger, Bag/Wishlist badges)
├── MainRouteOutlet
│   ├── HomePage
│   │   ├── StudioHero (Auto-shift Framer Motion carousel w/ progress timeline, pause-on-hover, quick-buy dock)
│   │   ├── KitAutoShiftCarousel ("2026/27 European & UCL Kit Edit" — auto-shifting portrait 3:4 rail)
│   │   ├── KitAutoShiftCarousel ("Cambodia Varaman & 2026 F1 Paddock" — auto-shifting portrait 3:4 rail)
│   │   ├── PartnerBrandStrip (8-col architectural grid)
│   │   └── CustomStudioSpotlight & Phnom Penh Community Proof
│   ├── ShopPage (Collection PLP)
│   │   ├── KitFilterBar (Zando-style minimal single-row bar for jersey/f1 collections)
│   │   │   ├── FilterDrawerTrigger + ActiveCount
│   │   │   ├── InlineDropdownPopover (League | Brand | Size | Price | Custom Print)
│   │   │   ├── SortSelect + GridDensityToggle (2 | 3 | 4 cols)
│   │   │   └── ActiveFilterChipStrip + "Clear All"
│   │   ├── KitProductCard (Minimalist 3:4 portrait jersey card)
│   │   │   ├── Aspect3x4MediaStage (Front photo ↔ Hover back-kit / detail crossfade)
│   │   │   ├── OptimisticWishlistButton (Spring heart scale animation)
│   │   │   ├── QuickSizeHoverTray (1-click S/M/L/XL/XXL Add-to-Bag)
│   │   │   └── InlineEditionSwatchRow (Club Home/Away/Third instant card morph)
│   │   └── FilterSlideOverDrawer (Mobile & full-facet desktop overlay with Escape & backdrop lock)
│   └── ProductDetailPage (Jersey / Kit PDP Mode)
│       ├── KitPdpGallery (Left vertical thumbnail rail + swipeable main stage + Lightbox zoom)
│       ├── KitPurchaseModule (Contiguous right sticky column)
│       │   ├── BreadcrumbTrail
│       │   ├── EditionPhotoSwatchMatrix (Miniature kit photo cards for club Home / Away / Third)
│       │   ├── SizeSelectorGrid + InlineSizeGuideTrigger + SoldOutNotifyModal
│       │   ├── CustomHeatPressAccordion (Live SVG back preview + player/number/patch)
│       │   ├── ActionRow (Full-width Add to Bag + Wishlist square + Share link button)
│       │   ├── TwoColTrustStrip (Same-Day Phnom Penh Express | 30-Day Easy Return)
│       │   └── MinimalistDisclosureAccordions (Kit Story, Authentic Fabric & Care, Fit & Sizing)
│       ├── StickyPdpBuyBar (IntersectionObserver-triggered bottom bar when primary CTA leaves viewport)
│       └── KitAutoShiftCarousel ("You May Also Like" + "Recently Viewed Kits")
└── Overlays (CartDrawer, WishlistDrawer, SearchOverlay, QuickViewModal, SizeGuideModal, ToastStack)
```

---

## 2. Core TypeScript Interfaces

```ts
export interface KitAutoShiftCarouselProps {
  eyebrow: string;
  title: string;
  editorialAccent?: string;
  products: Product[];
  autoShiftMs?: number; // Default: 4200ms; pauses on hover/focus & honors prefers-reduced-motion
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export interface KitProductCardProps {
  product: Product;
  variant?: 'minimal-kit' | 'standard';
  priority?: boolean;
}

export interface KitFilterBarProps {
  title: string;
  itemCount: number;
  filters: ShopFilters;
  sortBy: SortOption;
  gridDensity: GridDensity;
  onUpdateFilters: (updater: (prev: ShopFilters) => ShopFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onDensityChange: (density: GridDensity) => void;
  onOpenDrawer: () => void;
  onResetAll: () => void;
}

export interface KitEditionSwatchProps {
  currentProduct: Product;
  editions: Product[]; // Same-club sibling kits (Home, Away, Third, Special)
  onSelectEdition: (slug: string) => void;
}

export interface KitAccordionItem {
  id: string;
  title: string;
  summary?: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}
```

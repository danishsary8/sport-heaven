# 03 — Client State Architecture & Motion Interaction Specs
**Runtime:** React 19 + TypeScript Strict + `motion/react` (Framer Motion) + `localStorage` Persistence

---

## 1. Client State Stores (`StoreContext` + Pure Commerce Engine)

| State Slice | Storage Key | Responsibilities & Edge-Case Handling |
| :--- | :--- | :--- |
| **Cart Store** | `sport_castle_cart_v1` | Add/remove/update qty, inline size change, promo code validation (`CASTLE10`, `KIT15`, `UCL2026`), automatic 10% team kit discount on 5+ jerseys, free Phnom Penh express progress math ($50 threshold), dual USD + KHR (`1 USD = 4,100 KHR`) calculation, auto-open slide-over drawer. |
| **Wishlist Store** | `sport_castle_wishlist_v1` | Optimistic toggle with immediate heart spring animation, live header counter badge, sync with `/#/account/wishlist` and restock alert subscriptions. |
| **Recently Viewed Store** | `sport_castle_recent_v1` | Ring buffer of last 8 viewed product IDs, powers the PDP "Recently Viewed Kits" rail without duplicating the current SKU. |
| **Filter & URL Sync** | Hash query params (`?league=...&brand=...&size=...&sort=...`) | Bidirectional sync between `ShopFilters` and URL query string so filtered kit views are shareable and survive browser back/forward navigation. |
| **Overlay & Focus Manager** | In-memory UI state | Single active overlay invariant (opening Cart closes Search/Wishlist/QuickView), `Escape` key dismissal, backdrop click dismissal, body scroll lock while drawers/modals are open. |

---

## 2. Motion & Auto-Shift Carousel Choreography

All animations strictly target GPU-composited properties (`transform`, `opacity`) and respect `@media (prefers-reduced-motion: reduce)`:

1. **Auto-Shift Hero Showcase (`StudioHero`)**:
   - **Auto-advance interval**: `5200ms` with a live animated linear progress bar (`scaleX: 0 → 1`) inside the active slide indicator segment.
   - **Transition**: `AnimatePresence mode="wait"` with smooth directional horizontal slide + subtle opacity & scale settle (`cubic-bezier(0.16, 1, 0.3, 1)`, `420ms`).
   - **Pause triggers**: Pauses immediately on pointer hover, keyboard focus within the hero, or when `prefers-reduced-motion: reduce` is active; includes explicit Play/Pause toggle button for full WCAG accessibility.
2. **Auto-Shift Horizontal Kit Carousels (`KitAutoShiftCarousel`)**:
   - **Auto-shift cadence**: Advances cleanly by 1 visible card column every `4000ms` using `scrollTo({ behavior: 'smooth' })` with seamless loop-back to start upon reaching the rail end.
   - **Dual control**: Supports CSS `scroll-snap-type: x mandatory` touch/trackpad momentum scrolling, left/right minimalist hairline arrow controls, live slide counter (`01 / 08`), and animated auto-shift progress bar that pauses on hover/touch.
3. **Minimalist Jersey Card Micro-Interactions (`KitProductCard`)**:
   - **Hover image crossfade**: Smooth `280ms` opacity crossfade revealing a clean kit detail / live back-number preview layer on hover without layout shift.
   - **Edition swatch morph**: Clicking a club colorway swatch crossfades the card artwork, title, price, and edition label inline (`180ms`) without leaving the PLP grid.
   - **Quick-Size drawer**: Smooth `translateY` rise on hover/tap revealing `S M L XL XXL` 1-click Add-to-Bag cells with check confirmation (`650ms`) before opening the Cart Drawer.
4. **PDP Sticky Add-to-Bag Bar**:
   - Driven by an `IntersectionObserver` watching the primary `Add to Bag` button. Only slides up into view (`translateY(100%) → 0`) after the user scrolls past the purchase module, staying compact (`≤ 68px`) to honor the 15% mobile sticky surface cap.

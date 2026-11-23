# 04 — Original Design System: SPORT CASTLE Minimalist Kit Atelier
**Design Philosophy:** Swiss Architectural Minimalism meets Luxury Football Kit Editorial (inspired by `ui-ux-pro-max` whitespace discipline and strictly distinct from Zando branding, colors, or assets).

---

## 1. Visual Differentiation Guarantee
- **Brand Identity**: **SPORT CASTLE** — Phnom Penh's Football, Futsal & Motorsport Kit Atelier.
- **Zero Copied Assets**: 100% locally generated studio photography (`/src/assets/images/`), original typography pairing, original warm stone/paper neutral palette, and original bespoke micro-interactions.

---

## 2. Semantic Color Tokens (60 / 30 / 10 Discipline)

| Token | Hex | Role | Budget |
| :--- | :--- | :--- | :--- |
| `--surface-canvas` | `#FAF9F6` | Warm Alabaster minimalist page backdrop (strictly warm, `< 4%` saturation) | **60%** |
| `--surface-paper` | `#FFFFFF` | Pure gallery card & modal containment surface | **20%** |
| `--surface-studio` | `#F1EFEA` | Soft travertine portrait stage behind `3:4` jerseys (high contrast for white & dark kits alike) | **10%** |
| `--ink-primary` | `#0E1113` | Deep Pitch Obsidian for headlines, prices, and primary dark buttons | Structural |
| `--ink-secondary` | `#5F625C` | Muted Graphite Slate for metadata, breadcrumbs, and secondary labels (`≥ 5.8:1` contrast) | Structural |
| `--border-hairline` | `rgba(14, 17, 19, 0.10)` | Precision 1px architectural divider replacing heavy drop shadows | Structural |
| `--accent-crimson` | `#C8232C` | Angkor Vermilion — reserved exclusively for active CTAs, sale prices, and active carousel progress | **10%** |
| `--accent-brass` | `#B8933B` | Championship Brass — understated editorial indices and loyalty progress | Micro-accent |

---

## 3. Typography Scale (2 + 1 Font System)

1. **Display / Headlines**: `Barlow Condensed` (700/800, tight `-0.015em` tracking, `text-wrap: balance`) paired selectively with quiet editorial italics (`Instrument Serif` italic) for kit colorway subtitles.
2. **UI & Body Prose**: `Plus Jakarta Sans` (400/500/600, `15px` base, `1.6` line-height, clean single-line navigation links without pill capsules).
3. **Prices, Sizes & Spec Telemetry**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` so USD/KHR pricing, sizes (`S–XXL`), and carousel counters (`01 / 06`) align vertically with Swiss precision.

---

## 4. Minimalism & Spacing Rhythm Rules (Applied to Jerseys & Kits)

- **Whitespace as Luxury**: Generous section rhythm (`py-14 lg:py-20`) and crisp `gap-x-5 gap-y-10` portrait kit grids without nested "cards inside cards".
- **Zero-Pill Metadata**: Kit metadata renders as clean unboxed text separated by `·` (e.g., `FC Barcelona · 2026/27 Home · La Liga`), never candy pill badge clusters.
- **Uniform Portrait Aspect Ratio (`3:4`)**: Every jersey card across carousels, PLPs, and related rails shares a locked `aspect-[3/4]` studio stage so grid baselines align across every row.
- **Minimalist Controls**: Thin `2px` progress bars, numeric slide indices (`01 / 08`), borderless image surfaces with subtle `1px` frame shifts on hover, and crisp rectangular size selectors (`rounded-none` / `2px` micro-chamfer).

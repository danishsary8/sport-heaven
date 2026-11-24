import type { LookbookBundle, ProductCategory } from '../types/store';
import { NEW_BOOT_IMAGES } from './boots';

/**
 * Curated Matchday Lookbooks & Full-Kit Bundles (inspired by Zando's editorial
 * collection stories, engineered specifically for Phnom Penh football & F1 culture).
 */
export const MATCHDAY_LOOKBOOKS: LookbookBundle[] = [
  {
    id: 'look-camp-nou-night',
    slug: 'european-night-matchday-pack',
    title: 'European Night Matchday Pack',
    subtitle: '2026/27 FC Barcelona Home Kit + Predator 25 Elite FT + FIFA Match Ball',
    tag: 'UEFA Champions League',
    pitchContext: 'Olympic Stadium & Full-Size Grass',
    heroImage: '/src/assets/images/jersey_barca_2627_home_1795132052931.jpg',
    discountPercent: 10,
    productIds: [
      'jersey-barca-2627-home',
      'boot-predator-25-elite-ft',
      'ball-adidas-pro-fifa',
    ],
    editorialNote:
      'Paired for commanding midfielders: Blaugrana 2026/27 breathable Dri-FIT ADV kit matched with the fold-over tongue Predator 25 Elite and official thermally bonded UCL ball.',
  },
  {
    id: 'look-phnom-penh-7v7',
    slug: 'phnom-penh-7v7-turf-pack',
    title: 'Phnom Penh 7v7 Turf Specialist',
    subtitle: 'Cambodia Varaman Home + Tiempo Pro TF + Grip Socks',
    tag: 'Local Pitch Favorite',
    pitchContext: 'Sen Sok & Toul Kork Artificial Turf',
    heroImage: '/src/assets/images/jersey_cambodia_blue_1795112605589.jpg',
    discountPercent: 10,
    productIds: [
      'jersey-cambodia-home',
      'boot-tiempo-10-tf',
      'gear-trusox-3-grip-socks',
    ],
    editorialNote:
      'Built for evening 7v7 leagues across Sen Sok and Toul Kork. Soft FlyTouch turf studs eliminate knee strain while anti-slip grip socks lock your heel inside the boot.',
  },
  {
    id: 'look-futsal-court-pro',
    slug: 'artificial-grass-ag-speed-pack',
    title: 'Artificial Grass Speed Control',
    subtitle: 'Real Madrid 2026/27 Home + Nike Mercurial Vapor 16 AG-Pro + FIFA Match Ball',
    tag: 'Artificial Grass AG',
    pitchContext: 'Modern 3G/4G Artificial Grass Pitches',
    heroImage: NEW_BOOT_IMAGES.vapor16Ag,
    discountPercent: 10,
    productIds: [
      'jersey-madrid-2627-home',
      'boot-nike-vapor-16-elite-ag',
      'ball-adidas-pro-fifa',
    ],
    editorialNote:
      'Low-cut Air Zoom Gripknit upper with hollow conical AG-Pro studs paired with a thermally bonded FIFA Quality Pro match ball for sharp pitch acceleration.',
  },
  {
    id: 'look-speed-paddock',
    slug: 'speed-carbon-paddock-pack',
    title: 'Carbon Speed & Paddock Pack',
    subtitle: 'Scuderia Ferrari 2026 Team Shirt + Puma Ultra 5 Carbon + Pro Shin Guards',
    tag: 'Motorsport & Speed',
    pitchContext: 'Wing Play & Sunday Race Watch',
    heroImage: NEW_BOOT_IMAGES.pumaUltra5,
    discountPercent: 10,
    productIds: [
      'f1-ferrari-team-jersey',
      'boot-puma-ultra-5-carbon',
      'gear-nike-mercurial-shinguards',
    ],
    editorialNote:
      'Formula 1 carbon engineering meets featherweight 168g SPEEDSYSTEM acceleration — designed for players who live in the fast lane on and off the pitch.',
  },
];

/**
 * Official Partner Brand Strip (adapted from Zando's multi-brand horizontal strip).
 */
export const PARTNER_BRANDS: Array<{
  name: string;
  display: string;
  tagline: string;
  brandFilter?: string;
  categoryFilter?: ProductCategory;
}> = [
  { name: 'Nike', display: 'NIKE', tagline: 'Mercurial · Phantom · Tiempo', brandFilter: 'Nike' },
  { name: 'Adidas', display: 'ADIDAS', tagline: 'Predator 25 · F50 · Real Madrid', brandFilter: 'Adidas' },
  { name: 'Puma', display: 'PUMA', tagline: 'Ultra 5 Carbon · Future · Man City', brandFilter: 'Puma' },
  { name: 'Mizuno', display: 'MIZUNO', tagline: 'Made in Japan Craftsmanship', brandFilter: 'Mizuno' },
  { name: 'New Balance', display: 'NEW BALANCE', tagline: 'Furon v7+ Pro Speed', brandFilter: 'New Balance' },
  { name: 'Varaman', display: 'VARAMAN', tagline: 'Official Cambodia National Kit', brandFilter: 'Varaman' },
  { name: 'F1 Paddock', display: 'F1 PADDOCK', tagline: 'Ferrari · Red Bull · Mercedes', categoryFilter: 'f1' },
];

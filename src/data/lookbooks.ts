import type { BranchId, LeagueId, LookbookBundle, ProductCategory, SurfaceType } from '../types/store';
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

export interface MegaMenuTile {
  label: string;
  sublabel: string;
  image: string;
  preset: {
    category?: ProductCategory | 'all';
    surface?: SurfaceType;
    brand?: string;
    league?: LeagueId | 'all';
    uclOnly?: boolean;
    branch?: BranchId | 'all';
  };
}

/**
 * Visual Thumbnail Mega-Menu Categories (reverse-engineered from Zando's circular-avatar
 * category dropdown, refined for Sport Castle's clean studio sports identity).
 */
export const MEGA_MENU_DATA: Record<
  'boots' | 'jerseys' | 'brands',
  {
    heading: string;
    subtitle: string;
    columns: Array<{
      title: string;
      items: MegaMenuTile[];
    }>;
    featuredCard: {
      eyebrow: string;
      title: string;
      description: string;
      image: string;
      ctaLabel: string;
      slug: string;
    };
  }
> = {
  boots: {
    heading: 'Football Boots & Soccer Cleats',
    subtitle: '15 authentic studded soccer boots engineered for natural grass (FG) & artificial turf (AG/TF/MG)',
    columns: [
      {
        title: 'By Pitch Surface',
        items: [
          {
            label: 'Firm Ground (FG)',
            sublabel: 'Natural grass cleats',
            image: '/src/assets/images/hero_mercurial_boot_1795112605976.jpg',
            preset: { category: 'boots', surface: 'FG' },
          },
          {
            label: 'Artificial Grass (AG)',
            sublabel: '3G/4G conical studs',
            image: NEW_BOOT_IMAGES.vapor16Ag,
            preset: { category: 'boots', surface: 'AG' },
          },
          {
            label: 'Studded Turf (TF · 5v5 / 7v7)',
            sublabel: 'Phnom Penh artificial turf',
            image: '/src/assets/images/boot_nike_tiempo_10_tf_cleat_1795196892552.jpg',
            preset: { category: 'boots', surface: 'TF' },
          },
          {
            label: 'Multi-Ground (MG)',
            sublabel: 'All-pitch versatility',
            image: '/src/assets/images/boot_puma_king_ultimate_fg_1795196892181.jpg',
            preset: { category: 'boots', surface: 'MG' },
          },
        ],
      },
      {
        title: 'Flagship Boot Silos',
        items: [
          {
            label: 'Adidas Predator 25 FT',
            sublabel: 'Fold-over tongue · $255',
            image: NEW_BOOT_IMAGES.predator25,
            preset: { category: 'boots', brand: 'Adidas' },
          },
          {
            label: 'Nike Mercurial & Luna',
            sublabel: 'Air Zoom & Gripknit',
            image: NEW_BOOT_IMAGES.phantomLuna2,
            preset: { category: 'boots', brand: 'Nike' },
          },
          {
            label: 'Puma Ultra 5 Carbon',
            sublabel: '168g Carbon plate',
            image: NEW_BOOT_IMAGES.pumaUltra5,
            preset: { category: 'boots', brand: 'Puma' },
          },
          {
            label: 'Mizuno Made in Japan',
            sublabel: 'Alpha MIJ & Morelia Neo',
            image: NEW_BOOT_IMAGES.mizunoAlpha,
            preset: { category: 'boots', brand: 'Mizuno' },
          },
          {
            label: 'New Balance Furon v7+',
            sublabel: 'Hypoknit off-set lace',
            image: NEW_BOOT_IMAGES.nbFuronV7,
            preset: { category: 'boots', brand: 'New Balance' },
          },
        ],
      },
    ],
    featuredCard: {
      eyebrow: 'New Arrival · Flagship',
      title: 'Adidas Predator 25 Elite FT',
      description: 'Lucid Red fold-over tongue with Strikeskin fins — in stock at Sonthormuk & Sen Sok.',
      image: NEW_BOOT_IMAGES.predator25,
      ctaLabel: 'Inspect Boot',
      slug: 'adidas-predator-25-elite-fold-over-tongue-fg',
    },
  },
  jerseys: {
    heading: '2026/27 European Kits, Cambodia & F1',
    subtitle: '27 official club, national & motorsport jerseys with same-day Phnom Penh printing',
    columns: [
      {
        title: '2026/27 Top 5 Leagues & UCL',
        items: [
          {
            label: 'UEFA Champions League',
            sublabel: '2026/27 UCL Match Editions',
            image: '/src/assets/images/jersey_psg_2627_third_ucl_1795132208861.jpg',
            preset: { category: 'jerseys', uclOnly: true },
          },
          {
            label: 'La Liga (Spain)',
            sublabel: 'Barça · Real Madrid · Atlético',
            image: '/src/assets/images/jersey_barca_2627_home_1795132052931.jpg',
            preset: { category: 'jerseys', league: 'La Liga' },
          },
          {
            label: 'Premier League',
            sublabel: 'Arsenal · Liverpool · City · Utd',
            image: '/src/assets/images/jersey_liverpool_2627_adidas_1795132208093.jpg',
            preset: { category: 'jerseys', league: 'Premier League' },
          },
          {
            label: 'Serie A (Italy)',
            sublabel: 'AC Milan · Inter · Juventus',
            image: '/src/assets/images/jersey_milan_2627_home_1795132051353.jpg',
            preset: { category: 'jerseys', league: 'Serie A' },
          },
          {
            label: 'Bundesliga & Ligue 1',
            sublabel: 'Bayern · Dortmund · PSG',
            image: '/src/assets/images/jersey_bayern_2627_home_1795132051319.jpg',
            preset: { category: 'jerseys', league: 'Bundesliga' },
          },
        ],
      },
      {
        title: 'Cambodia & Motorsport',
        items: [
          {
            label: 'Cambodia National Team',
            sublabel: 'Varaman Official Home & Away',
            image: '/src/assets/images/jersey_cambodia_blue_1795112605589.jpg',
            preset: { category: 'jerseys', league: 'International' },
          },
          {
            label: 'Cambodian Premier League',
            sublabel: 'PP Crown · PKR Svay Rieng',
            image: '/src/assets/images/jersey_club_white_gold_1795112606139.jpg',
            preset: { category: 'jerseys', league: 'Cambodian Premier League' },
          },
          {
            label: 'F1 Motorsport Paddock',
            sublabel: 'Ferrari · Red Bull · Mercedes',
            image: '/src/assets/images/jersey_f1_motorsport_1795112605294.jpg',
            preset: { category: 'f1' },
          },
          {
            label: 'FIFA Match Balls',
            sublabel: 'UCL Pro · Molten · Select Futsal',
            image: '/src/assets/images/ball_fifa_pro_1795112607243.jpg',
            preset: { category: 'balls' },
          },
          {
            label: 'GK Gloves & Essentials',
            sublabel: 'Predator Pro · Grip Socks',
            image: '/src/assets/images/gear_gk_essentials_1795112605503.jpg',
            preset: { category: 'essentials' },
          },
        ],
      },
    ],
    featuredCard: {
      eyebrow: '2026/27 Collector Edition',
      title: 'FC Barcelona Away Kobe Edition',
      description: 'Mamba-inspired gold & obsidian away kit with live heat-press custom printing.',
      image: '/src/assets/images/jersey_barca_2627_away_1795132052906.jpg',
      ctaLabel: 'View Edition',
      slug: 'fc-barcelona-2026-27-away-kobe-edition-jersey',
    },
  },
  brands: {
    heading: 'Shop by Official Brand',
    subtitle: '100% authentic retail imports stocked across our 3 Phnom Penh branches',
    columns: [
      {
        title: 'Global Football Leaders',
        items: [
          {
            label: 'Nike Football',
            sublabel: 'Boots, Barça, Chelsea, PSG',
            image: '/src/assets/images/hero_mercurial_boot_1795112605976.jpg',
            preset: { brand: 'Nike' },
          },
          {
            label: 'Adidas Football',
            sublabel: 'Predator, F50, Madrid, Arsenal',
            image: NEW_BOOT_IMAGES.predator25,
            preset: { brand: 'Adidas' },
          },
          {
            label: 'Puma Football',
            sublabel: 'Ultra 5 Carbon, Future, Milan',
            image: NEW_BOOT_IMAGES.pumaUltra5,
            preset: { brand: 'Puma' },
          },
          {
            label: 'Mizuno Japan',
            sublabel: 'Alpha MIJ & Morelia Neo IV',
            image: NEW_BOOT_IMAGES.mizunoAlpha,
            preset: { brand: 'Mizuno' },
          },
        ],
      },
      {
        title: 'Specialist & Local Icons',
        items: [
          {
            label: 'New Balance',
            sublabel: 'Furon v7+ Pro Speed',
            image: NEW_BOOT_IMAGES.nbFuronV7,
            preset: { brand: 'New Balance' },
          },
          {
            label: 'Varaman Cambodia',
            sublabel: 'Official FFC National Kits',
            image: '/src/assets/images/jersey_cambodia_blue_1795112605589.jpg',
            preset: { brand: 'Varaman' },
          },
          {
            label: 'Puma King Ultimate',
            sublabel: 'FG/AG Conical Studs',
            image: '/src/assets/images/boot_puma_king_ultimate_fg_1795196892181.jpg',
            preset: { category: 'boots', brand: 'Puma' },
          },
          {
            label: 'Scuderia Ferrari F1',
            sublabel: '2026 Paddock Teamwear',
            image: '/src/assets/images/jersey_f1_motorsport_1795112605294.jpg',
            preset: { category: 'f1' },
          },
        ],
      },
    ],
    featuredCard: {
      eyebrow: 'Handcrafted in Japan',
      title: 'Mizuno Alpha Elite MIJ',
      description: '190g KaRVO spring plate built for both natural grass and Phnom Penh 4G pitches.',
      image: NEW_BOOT_IMAGES.mizunoAlpha,
      ctaLabel: 'Explore Mizuno',
      slug: 'mizuno-alpha-made-in-japan-fg-ag',
    },
  },
};

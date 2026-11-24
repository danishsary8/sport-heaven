/**
 * Home page hero content. Change these lists to feature different kits;
 * everything else (images, names, prices) comes from the catalog.
 */

/** Kits shown in the hero carousel, in order (product slugs). */
export const HERO_KIT_SLUGS = [
  'real-madrid-2026-27-home-authentic-jersey',
  'fc-barcelona-2026-27-home-authentic-jersey',
  'arsenal-2026-27-home-authentic-jersey',
  'liverpool-2026-27-home-adidas-authentic-jersey',
  'argentina-3-star-champions-edition-jersey',
  'cambodia-national-team-home-jersey-varaman',
];

/** Quick links under the headline: label + shop filter (team facet value). */
export const HERO_TEAM_LINKS: Array<{ label: string; team: string }> = [
  { label: 'Real Madrid', team: 'real-madrid' },
  { label: 'Barcelona', team: 'fc-barcelona' },
  { label: 'Arsenal', team: 'arsenal' },
  { label: 'Liverpool', team: 'liverpool-fc' },
  { label: 'Man City', team: 'manchester-city' },
  { label: 'Argentina', team: 'argentina-national-team' },
  { label: 'Cambodia', team: 'cambodia-national-team' },
];

/** Time each side of a kit stays on screen during autoplay. */
export const HERO_SIDE_MS = 2800;

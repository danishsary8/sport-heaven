/**
 * A studio photo for each category tile on the home page, taken from the catalog's own product shots
 * (files in `public/assets`). Each category gets a product with its own colour, so the row reads as five
 * different things at a glance. A category without an entry gets a type-only tile.
 */
export const CATEGORY_IMAGES: Readonly<Record<string, string>> = {
  boots: '/assets/catalog/hero_mercurial_boot_1795112605976.jpg',
  jerseys: '/assets/catalog/jersey_cambodia_blue_1795112605589.jpg',
  f1: '/assets/catalog/jersey_f1_mercedes_2026_1795138746906.jpg',
  balls: '/assets/catalog/ball_ucl_pro_2627_1795193989350.jpg',
  jackets: '/assets/catalog/jacket_f1_mclaren_2026_1795194122903.jpg',
  essentials: '/assets/catalog/gear_gk_pro_gloves_1795138746248.jpg',
};

/**
 * Where to centre a tile's crop when it is not the default (50% 65%). Portrait shots (jackets, F1 kits) keep
 * the collar in view and run off the bottom edge instead of losing the top.
 */
export const CATEGORY_IMAGE_FOCUS: Readonly<Record<string, string>> = {
  f1: '50% 12%',
  jackets: '50% 12%',
};

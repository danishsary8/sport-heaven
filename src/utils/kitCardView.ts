import type { JerseyFontStyle, JerseyPatchId, Product } from '../types/store';

export type KitCardPinnedView = 'auto' | 'front' | 'back';

export interface KitBackPrintDefaults {
  playerName: string;
  squadNumber: string;
  patch: JerseyPatchId;
  fontStyle: JerseyFontStyle;
}

const CLUB_BACK_DEFAULTS: Array<{
  match: RegExp;
  playerName: string;
  squadNumber: string;
  patch?: JerseyPatchId;
}> = [
  { match: /cambodia/i, playerName: 'CHANTHEA', squadNumber: '10', patch: 'aff' },
  { match: /1998\/99|centenary/i, playerName: 'RIVALDO', squadNumber: '11', patch: 'champions' },
  { match: /barcelona|barça/i, playerName: 'YAMAL', squadNumber: '10', patch: 'ucl' },
  { match: /real madrid|madrid/i, playerName: 'BELLINGHAM', squadNumber: '5', patch: 'ucl' },
  { match: /atlético|atletico/i, playerName: 'GRIEZMANN', squadNumber: '7', patch: 'ucl' },
  { match: /arsenal/i, playerName: 'SAKA', squadNumber: '7', patch: 'ucl' },
  { match: /liverpool/i, playerName: 'SALAH', squadNumber: '11', patch: 'ucl' },
  { match: /manchester city|man city/i, playerName: 'HAALAND', squadNumber: '9', patch: 'ucl' },
  { match: /manchester united|man utd/i, playerName: 'FERNANDES', squadNumber: '8', patch: 'champions' },
  { match: /chelsea/i, playerName: 'PALMER', squadNumber: '10', patch: 'ucl' },
  { match: /ac milan|milan/i, playerName: 'LEÃO', squadNumber: '10', patch: 'ucl' },
  { match: /inter/i, playerName: 'LAUTARO', squadNumber: '10', patch: 'ucl' },
  { match: /juventus/i, playerName: 'YILDIZ', squadNumber: '10', patch: 'ucl' },
  { match: /bayern/i, playerName: 'MUSIALA', squadNumber: '42', patch: 'ucl' },
  { match: /dortmund/i, playerName: 'BRANDT', squadNumber: '10', patch: 'ucl' },
  { match: /paris|psg/i, playerName: 'DEMBÉLÉ', squadNumber: '10', patch: 'ucl' },
  { match: /argentina/i, playerName: 'MESSI', squadNumber: '10', patch: 'champions' },
  { match: /brazil.*2002|2002.*brazil/i, playerName: 'RONALDO', squadNumber: '9', patch: 'champions' },
  { match: /brazil/i, playerName: 'VINI JR', squadNumber: '7', patch: 'champions' },
  { match: /france/i, playerName: 'MBAPPÉ', squadNumber: '10', patch: 'champions' },
  { match: /spain/i, playerName: 'YAMAL', squadNumber: '19', patch: 'champions' },
  { match: /germany/i, playerName: 'WIRTZ', squadNumber: '17', patch: 'champions' },
  { match: /italy/i, playerName: 'BARELLA', squadNumber: '18', patch: 'champions' },
  { match: /japan/i, playerName: 'KUBO', squadNumber: '20', patch: 'aff' },
  { match: /korea/i, playerName: 'SON', squadNumber: '7', patch: 'aff' },
  { match: /ferrari/i, playerName: 'LECLERC', squadNumber: '16', patch: 'f1-paddock' },
  { match: /red bull/i, playerName: 'VERSTAPPEN', squadNumber: '1', patch: 'f1-paddock' },
  { match: /mercedes/i, playerName: 'RUSSELL', squadNumber: '63', patch: 'f1-paddock' },
  { match: /mclaren/i, playerName: 'NORRIS', squadNumber: '4', patch: 'f1-paddock' },
];

/**
 * Resolves whether a jersey/kit card should currently display the back view.
 * Mirrors Zando's smooth hover-to-back ergonomics while honoring manual front/back pins
 * (essential for mobile touch users and desktop users who want to re-check the front while hovering).
 */
export function resolveKitCardShowingBack(params: {
  hasBackView: boolean;
  isHovering: boolean;
  pinnedView: KitCardPinnedView;
}): boolean {
  if (!params.hasBackView) return false;
  if (params.pinnedView === 'back') return true;
  if (params.pinnedView === 'front') return false;
  return params.isHovering;
}

/**
 * Computes the next pinned state when a user clicks the manual front/back view toggle button.
 */
export function getNextKitCardPinnedView(params: {
  currentlyShowingBack: boolean;
  isHovering: boolean;
}): KitCardPinnedView {
  if (params.currentlyShowingBack) {
    // If hovering caused back view, explicitly pin front; if touch-pinned back, return to auto/front
    return params.isHovering ? 'front' : 'auto';
  }
  return 'back';
}

/**
 * Returns authentic club/team back print details (name, squad number, sleeve patch, typography)
 * for a kit card's back-of-jersey hover presentation.
 */
export function getKitBackPrintDefaults(
  product: Pick<Product, 'name' | 'club' | 'category' | 'isChampionsLeague'>,
): KitBackPrintDefaults {
  const haystack = `${product.club ?? ''} ${product.name}`;
  const matched = CLUB_BACK_DEFAULTS.find((entry) => entry.match.test(haystack));

  const fontStyle: JerseyFontStyle =
    product.category === 'f1' ? 'motorsport-aero' : 'pro-condensed';

  if (matched) {
    return {
      playerName: matched.playerName,
      squadNumber: matched.squadNumber,
      patch:
        matched.patch ??
        (product.category === 'f1'
          ? 'f1-paddock'
          : product.isChampionsLeague
            ? 'ucl'
            : 'none'),
      fontStyle,
    };
  }

  const fallbackName =
    product.club?.split(' ').pop()?.toUpperCase() ?? 'CASTLE';

  return {
    playerName: fallbackName,
    squadNumber: product.category === 'f1' ? '16' : '10',
    patch:
      product.category === 'f1'
        ? 'f1-paddock'
        : product.isChampionsLeague
          ? 'ucl'
          : 'none',
    fontStyle,
  };
}

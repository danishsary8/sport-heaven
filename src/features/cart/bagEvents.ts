/** Window events between the add-to-bag flight, alerts and the header bag (kept tiny: the header loads it up front). */
export const BAG_BUMP = 'sh:bag-bump';
export const BAG_OPEN = 'sh:bag-open';

/** Opens the bag drawer from anywhere (the alert's "View bag" uses this). */
export function openBag() {
  window.dispatchEvent(new CustomEvent(BAG_OPEN));
}

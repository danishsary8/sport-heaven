/**
 * Shop prices always end in .90 (the server enforces it): a price that doesn't moves down to the .90 just below it,
 * $12.00 and $12.50 become $11.90, never below $0.90. Used to show the price that will really be saved.
 */
export function toNinety(cents: number): number {
  if (cents <= 90) return 90;
  return Math.floor((cents - 90) / 100) * 100 + 90;
}

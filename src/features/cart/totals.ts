/**
 * The bag's items and printing, worked out from its lines so the totals add up on screen:
 * items = what the shirts/boots cost, printing = names and numbers (both × quantity, sellable lines only).
 */
export function bagParts(lines: { unitPriceCents: number; printFeeCents: number; qty: number; purchasable: boolean }[]) {
  const live = lines.filter((l) => l.purchasable);
  return {
    itemsCents: live.reduce((n, l) => n + l.unitPriceCents * l.qty, 0),
    printingCents: live.reduce((n, l) => n + l.printFeeCents * l.qty, 0),
  };
}

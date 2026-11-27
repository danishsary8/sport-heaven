/** Categories that stay in the shop but are left out of the top menu (their products are still found everywhere else). */
const HIDDEN_FROM_MENU = new Set(['essentials']);

/** Kept apart from the mega menu so the header can use it without loading the menu's copy. */
export const inTopMenu = (slug: string) => !HIDDEN_FROM_MENU.has(slug);

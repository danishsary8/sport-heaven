export const GUEST_WISHLIST_STORAGE_KEY = 'sport_castle_guest_wishlist_v2';
export const MEMBER_WISHLIST_STORAGE_KEY = 'sport_castle_wishlist_v2';

export const DEFAULT_WISHLIST_SEED: string[] = [
  'boot-predator-25-elite-ft',
  'jersey-barca-2627-home',
];

export interface PersistedWishlistPayload {
  version: 2;
  scope: 'guest' | 'member';
  items: string[];
  updatedAt: string;
}

export function getWishlistStorageKey(isAuthenticated: boolean): string {
  return isAuthenticated
    ? MEMBER_WISHLIST_STORAGE_KEY
    : GUEST_WISHLIST_STORAGE_KEY;
}

/**
 * Sanitizes, trims, and deduplicates product IDs while optionally filtering
 * against the active catalog ID set so stale or malformed entries never leak into UI counts.
 */
export function sanitizeWishlistIds(
  raw: unknown,
  validIds?: ReadonlySet<string>,
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim();
    if (!id || seen.has(id)) continue;
    if (validIds && !validIds.has(id)) continue;
    seen.add(id);
    clean.push(id);
  }
  return clean;
}

/**
 * Parses either a v2 structured wishlist payload or a legacy raw string[] array
 * from `localStorage`. Falls back gracefully on missing or corrupted JSON.
 */
export function parseWishlistStoragePayload(
  raw: string | null,
  fallback: string[],
  validIds?: ReadonlySet<string>,
): { ids: string[]; updatedAt: string | null; found: boolean } {
  if (raw === null) {
    return {
      ids: sanitizeWishlistIds(fallback, validIds),
      updatedAt: null,
      found: false,
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return {
        ids: sanitizeWishlistIds(parsed, validIds),
        updatedAt: null,
        found: true,
      };
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'items' in parsed &&
      Array.isArray((parsed as { items: unknown }).items)
    ) {
      const record = parsed as Partial<PersistedWishlistPayload>;
      return {
        ids: sanitizeWishlistIds(record.items, validIds),
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
        found: true,
      };
    }
  } catch {
    // Ignore malformed JSON and fall back cleanly
  }

  return {
    ids: sanitizeWishlistIds(fallback, validIds),
    updatedAt: null,
    found: false,
  };
}

export function serializeWishlistStoragePayload(
  ids: string[],
  isAuthenticated: boolean,
  updatedAt: string = new Date().toISOString(),
): string {
  const payload: PersistedWishlistPayload = {
    version: 2,
    scope: isAuthenticated ? 'member' : 'guest',
    items: sanitizeWishlistIds(ids),
    updatedAt,
  };
  return JSON.stringify(payload);
}

/**
 * Merges a logged-out guest's saved wishlist items ahead of a member's existing
 * wishlist upon sign-in/registration, preserving order without duplicates.
 */
export function mergeGuestWishlistIntoMember(
  guestIds: string[],
  memberIds: string[],
  validIds?: ReadonlySet<string>,
): string[] {
  return sanitizeWishlistIds([...guestIds, ...memberIds], validIds);
}

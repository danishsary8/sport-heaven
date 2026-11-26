/** The member's wishlist: the query and the optimistic heart toggle. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';
import { useToast } from '../../../ui';

export type Wishlist = ResponseOf<'/v1/me/wishlist', 'get'>;

/** Query key prefix for every wishlist query (all languages). */
export const wishlistKey = ['me', 'wishlist'] as const;

/** The signed-in member's wishlist; disabled for guests. */
export function useWishlist(enabled = true) {
  const { status } = useAuth();
  const { lang } = useI18n();
  return useQuery({ queryKey: [...wishlistKey, lang], queryFn: ({ signal }) => apiFetch<Wishlist>('/v1/me/wishlist', { withLang: true, signal }), enabled: enabled && status === 'member' });
}

/** Optimistic heart: flips at once, rolls back with a message if the server refuses. */
export function useToggleWishlist() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, lang } = useI18n();
  return useMutation({
    mutationFn: ({ slug, on }: { slug: string; on: boolean }) => apiFetch(`/v1/me/wishlist/${encodeURIComponent(slug)}`, { method: on ? 'PUT' : 'DELETE' }),
    onMutate: async ({ slug, on }) => {
      const key = [...wishlistKey, lang];
      await qc.cancelQueries({ queryKey: wishlistKey });
      const before = qc.getQueryData<Wishlist>(key);
      if (before) {
        const products = on ? [...before.products, { slug } as Wishlist['products'][number]] : before.products.filter((p) => p.slug !== slug);
        qc.setQueryData<Wishlist>(key, { ...before, products });
      }
      return { before, key };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) qc.setQueryData(ctx.key, ctx.before);
      toast.error(e instanceof Error ? e.message : t('common.error'));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: wishlistKey }),
  });
}

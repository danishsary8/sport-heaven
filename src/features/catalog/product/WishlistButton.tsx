import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Link } from 'react-router';
import { apiFetch, type ResponseOf } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';
import { cx, useToast } from '../../../ui';

export type Wishlist = ResponseOf<'/v1/me/wishlist', 'get'>;
export const wishlistKey = ['me', 'wishlist'] as const;

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

export function WishlistButton({ slug }: { slug: string }) {
  const { t } = useI18n();
  const { status } = useAuth();
  const list = useWishlist();
  const toggle = useToggleWishlist();
  const base = 'grid size-11 shrink-0 place-items-center rounded-full border border-[#C9C5BB] hover:border-obsidian';
  if (status !== 'member') {
    return (
      <Link to="/sign-in" state={{ from: `/p/${slug}` }} className={base} aria-label={t('wishlist.signIn')}>
        <Heart className="size-5" aria-hidden />
      </Link>
    );
  }
  const on = !!list.data?.products.some((p) => p.slug === slug);
  return (
    <button type="button" className={base} aria-pressed={on} aria-label={t('wishlist.save')} onClick={() => toggle.mutate({ slug, on: !on })}>
      <Heart className={cx('size-5', on && 'fill-vermilion text-vermilion')} aria-hidden />
    </button>
  );
}

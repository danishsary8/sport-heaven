import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type BodyOf, type ResponseOf } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export type CartResponse = ResponseOf<'/v1/cart', 'get'>;
export type Cart = CartResponse['cart'];
export type CartLine = Cart['lines'][number];
export type AddItemBody = BodyOf<'/v1/cart/items', 'post'>;

export const cartKey = (lang: string) => ['cart', lang] as const;

export function useCart() {
  const { lang } = useI18n();
  return useQuery({ queryKey: cartKey(lang), queryFn: ({ signal }) => apiFetch<CartResponse>('/v1/cart', { withLang: true, signal }), staleTime: 10_000 });
}

/** Number of items in the bag, or null when unknown (loading or failed). */
export function useBagCount(): number | null {
  const cart = useCart();
  if (!cart.data) return null;
  return cart.data.cart.lines.reduce((n, l) => n + l.qty, 0);
}

/** Every bag mutation returns the full bag: write it straight into the cache (other languages refetch). */
function useCartMutation<V>(send: (v: V) => Promise<CartResponse>) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (data) => {
      qc.setQueryData(cartKey(lang), data);
      void qc.invalidateQueries({ queryKey: ['cart'], predicate: (q) => q.queryKey[1] !== lang });
    },
  });
}

export function useAddToCart() {
  return useCartMutation((body: AddItemBody) => apiFetch<CartResponse>('/v1/cart/items', { method: 'POST', body, withLang: true }));
}

export function useUpdateLine() {
  return useCartMutation(({ id, ...body }: { id: string; qty?: number; variantId?: string }) =>
    apiFetch<CartResponse>(`/v1/cart/items/${encodeURIComponent(id)}`, { method: 'PATCH', body, withLang: true }),
  );
}

export function useRemoveLine() {
  return useCartMutation((id: string) => apiFetch<CartResponse>(`/v1/cart/items/${encodeURIComponent(id)}`, { method: 'DELETE', withLang: true }));
}

export function useApplyPromo() {
  return useCartMutation((code: string) => apiFetch<CartResponse>('/v1/cart/promo', { method: 'PUT', body: { code }, withLang: true }));
}

export function useRemovePromo() {
  return useCartMutation(() => apiFetch<CartResponse>('/v1/cart/promo', { method: 'DELETE', withLang: true }));
}

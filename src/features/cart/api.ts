import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export type CartResponse = ResponseOf<'/v1/cart', 'get'>;
export type Cart = CartResponse['cart'];

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

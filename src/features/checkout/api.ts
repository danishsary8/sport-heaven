import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, type BodyOf, type ResponseOf } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export type QuoteBody = BodyOf<'/v1/checkout/quote', 'post'>;
export type Quote = ResponseOf<'/v1/checkout/quote', 'post'>;
export type OrderBody = BodyOf<'/v1/orders', 'post'>;
export type OrderResponse = ResponseOf<'/v1/orders', 'post'>;
export type Order = OrderResponse['order'];

/** A quote for the current bag; the key includes everything the price depends on. */
export function useQuote(body: QuoteBody | null) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['checkout', 'quote', lang, body],
    queryFn: ({ signal }) => apiFetch<Quote>('/v1/checkout/quote', { method: 'POST', body: { ...body, lang }, signal }),
    enabled: !!body,
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

export function usePlaceOrder() {
  const { lang } = useI18n();
  return useMutation({
    mutationFn: ({ body, key }: { body: OrderBody; key: string }) => apiFetch<OrderResponse>('/v1/orders', { method: 'POST', body: { ...body, lang }, headers: { 'idempotency-key': key } }),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type BodyOf, type ResponseOf } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { readOrderAccess } from '../checkout/orderAccess';

export type OrderDetail = ResponseOf<'/v1/orders/{number}', 'get'>;
export type OrderView = OrderDetail['order'];
export type Payment = NonNullable<OrderDetail['payment']>;
export type PaymentStatus = ResponseOf<'/v1/orders/{number}/payment-status', 'get'>;
export type PayMethod = NonNullable<BodyOf<'/v1/orders/{number}/payments', 'post'>['method']>;
export type Tracked = ResponseOf<'/v1/orders/track', 'post'>;

export const orderKey = (number: string) => ['order', number] as const;

/** The token header for a guest's order (members are recognised by their sign-in). */
function accessHeaders(number: string): Record<string, string> {
  const access = readOrderAccess(number);
  return access?.token ? { 'x-order-token': access.token } : {};
}

export function useOrder(number: string) {
  const { lang } = useI18n();
  const { status } = useAuth();
  return useQuery({
    queryKey: [...orderKey(number), lang],
    queryFn: ({ signal }) => apiFetch<OrderDetail>(`/v1/orders/${encodeURIComponent(number)}`, { headers: accessHeaders(number), withLang: true, signal }),
    enabled: status !== 'loading',
  });
}

/** Polled every 3 s while the page is visible (TanStack pauses interval refetches in background tabs). */
export function usePaymentStatus(number: string, enabled: boolean) {
  return useQuery({
    queryKey: [...orderKey(number), 'payment-status'],
    queryFn: ({ signal }) => apiFetch<PaymentStatus>(`/v1/orders/${encodeURIComponent(number)}/payment-status`, { headers: accessHeaders(number), signal }),
    enabled,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useSwitchPayment(number: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (method: PayMethod) => {
      const access = readOrderAccess(number);
      return apiFetch<ResponseOf<'/v1/orders/{number}/payments', 'post'>>(`/v1/orders/${encodeURIComponent(number)}/payments`, {
        method: 'POST',
        body: { method, ...(access ? { contactPhone: access.phone, orderAccessToken: access.token } : {}) },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKey(number) }),
  });
}

export function useCancelOrder(number: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const access = readOrderAccess(number);
      return apiFetch(`/v1/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST', body: access ? { contactPhone: access.phone, orderAccessToken: access.token } : {} });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKey(number) }),
  });
}

export function useTrackOrder() {
  return useMutation({
    mutationFn: (body: { orderNumber: string; phone: string }) => apiFetch<Tracked>('/v1/orders/track', { method: 'POST', body, withLang: true }),
  });
}

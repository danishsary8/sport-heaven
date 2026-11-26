import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type BodyOf, type ResponseOf } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export type Addresses = ResponseOf<'/v1/me/addresses', 'get'>;
export type Address = Addresses['addresses'][number];
export type AddressBody = BodyOf<'/v1/me/addresses', 'post'>;

export const addressesKey = ['me', 'addresses'] as const;

export function useAddresses() {
  const { status } = useAuth();
  return useQuery({ queryKey: addressesKey, queryFn: ({ signal }) => apiFetch<Addresses>('/v1/me/addresses', { signal }), enabled: status === 'member' });
}

function useAddressMutation<V>(send: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: send, onSuccess: () => qc.invalidateQueries({ queryKey: addressesKey }) });
}

export function useCreateAddress() {
  return useAddressMutation((body: AddressBody) => apiFetch('/v1/me/addresses', { method: 'POST', body }));
}
export function useUpdateAddress() {
  return useAddressMutation(({ id, body }: { id: string; body: Partial<AddressBody> }) => apiFetch(`/v1/me/addresses/${id}`, { method: 'PATCH', body }));
}
export function useDeleteAddress() {
  return useAddressMutation((id: string) => apiFetch(`/v1/me/addresses/${id}`, { method: 'DELETE' }));
}
export function useDefaultAddress() {
  return useAddressMutation((id: string) => apiFetch(`/v1/me/addresses/${id}/default`, { method: 'POST' }));
}

export type Me = ResponseOf<'/v1/me', 'get'>['user'];
export type MeBody = BodyOf<'/v1/me', 'patch'>;
export type Loyalty = ResponseOf<'/v1/me/loyalty', 'get'>;
export type MyOrders = ResponseOf<'/v1/me/orders', 'get'>;
export type MyOrder = ResponseOf<'/v1/me/orders/{number}', 'get'>;
export type MyReturns = ResponseOf<'/v1/me/returns', 'get'>;
export type ReturnBody = BodyOf<'/v1/me/returns', 'post'>;

export function useMe() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['me', 'profile'], queryFn: ({ signal }) => apiFetch<{ user: Me }>('/v1/me', { signal }), enabled: status === 'member' });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: (body: MeBody) => apiFetch('/v1/me', { method: 'PATCH', body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me', 'profile'] });
      void refresh();
    },
  });
}

export function useDeleteMe() {
  return useMutation({ mutationFn: () => apiFetch('/v1/me', { method: 'DELETE' }) });
}

export function useLoyalty() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['me', 'loyalty'], queryFn: ({ signal }) => apiFetch<Loyalty>('/v1/me/loyalty', { signal }), enabled: status === 'member' });
}

export function useMyOrders(page = 1) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['me', 'orders', page],
    queryFn: ({ signal }) => apiFetch<MyOrders>('/v1/me/orders', { query: { page, pageSize: 20 }, withLang: true, signal }),
    enabled: status === 'member',
  });
}

export function useMyOrder(number: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['me', 'order', number],
    queryFn: ({ signal }) => apiFetch<MyOrder>(`/v1/me/orders/${encodeURIComponent(number)}`, { withLang: true, signal }),
    enabled: status === 'member' && !!number,
  });
}

export function useMyReturns() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['me', 'returns'], queryFn: ({ signal }) => apiFetch<MyReturns>('/v1/me/returns', { signal }), enabled: status === 'member' });
}

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReturnBody) => apiFetch('/v1/me/returns', { method: 'POST', body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'returns'] });
      void qc.invalidateQueries({ queryKey: ['me', 'order'] });
    },
  });
}

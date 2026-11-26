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

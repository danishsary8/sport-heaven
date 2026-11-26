import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../../lib/api';

export type PrintOptions = ResponseOf<'/v1/catalog/print-options', 'get'>;

/** Print limits, patches and fees from the API (cached for ten minutes). */
export function usePrintOptions(enabled = true) {
  return useQuery({
    queryKey: ['catalog', 'print-options'],
    queryFn: ({ signal }) => apiFetch<PrintOptions>('/v1/catalog/print-options', { signal }),
    staleTime: 10 * 60_000,
    enabled,
  });
}

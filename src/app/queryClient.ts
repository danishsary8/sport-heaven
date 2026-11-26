import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../lib/api';

/** Retries only failures worth retrying (connection, 5xx, busy) and never a 4xx answer. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => count < 2 && (!isApiError(error) || error.status === 0 || error.status >= 500),
      },
      mutations: { retry: false },
    },
  });
}

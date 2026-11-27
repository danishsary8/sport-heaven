import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiFetch, type FetchOptions } from '../../lib/api';
import { useAuth } from '../../lib/auth';

type Query = FetchOptions['query'];

/** Admin reads: never cached across sign-outs (the 'admin' key is private) and fresh on every visit. */
export function useAdminQuery<T>(key: QueryKey, path: string, query?: Query, opts: { enabled?: boolean; refetchInterval?: number; keepPrevious?: boolean } = {}) {
  const { status, user } = useAuth();
  const staff = status === 'member' && (user?.role === 'staff' || user?.role === 'admin');
  return useQuery({
    queryKey: ['admin', ...key, query ?? null],
    queryFn: ({ signal }) => apiFetch<T>(path, { query, signal }),
    enabled: staff && (opts.enabled ?? true),
    staleTime: 0,
    refetchInterval: opts.refetchInterval,
    // Filters, pages and ranges: keep showing the last answer while the next one loads (no flash).
    placeholderData: opts.keepPrevious ? keepPreviousData : undefined,
  });
}

/**
 * Admin writes: on success, refresh every admin query whose key starts with one of `invalidate`, and mark the
 * shop's catalog data stale so an edit (a new photo, price or name) shows on the next shop page in this tab.
 */
export function useAdminMutation<V, R = unknown>(send: (v: V) => Promise<R>, invalidate: QueryKey[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => Promise.all([...invalidate.map((k) => qc.invalidateQueries({ queryKey: ['admin', ...k] })), qc.invalidateQueries({ queryKey: ['catalog'] })]),
  });
}

export const post = <R = unknown>(path: string, body?: unknown) => apiFetch<R>(path, { method: 'POST', body: body ?? {} });
export const patch = <R = unknown>(path: string, body: unknown) => apiFetch<R>(path, { method: 'PATCH', body });
export const put = <R = unknown>(path: string, body: unknown) => apiFetch<R>(path, { method: 'PUT', body });

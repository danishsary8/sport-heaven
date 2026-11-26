import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export type Menu = ResponseOf<'/v1/catalog/menu', 'get'>;
export type Branches = ResponseOf<'/v1/branches', 'get'>;
export type Branch = Branches['branches'][number];

export function useMenu() {
  const { lang } = useI18n();
  return useQuery({ queryKey: ['catalog', 'menu', lang], queryFn: ({ signal }) => apiFetch<Menu>('/v1/catalog/menu', { withLang: true, signal }), staleTime: 5 * 60_000 });
}

export function useBranches() {
  const { lang } = useI18n();
  return useQuery({ queryKey: ['branches', lang], queryFn: ({ signal }) => apiFetch<Branches>('/v1/branches', { withLang: true, signal }), staleTime: 10 * 60_000 });
}

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export type Menu = ResponseOf<'/v1/catalog/menu', 'get'>;
export type Branches = ResponseOf<'/v1/branches', 'get'>;
export type Branch = Branches['branches'][number];
export type ProductList = ResponseOf<'/v1/catalog/products', 'get'>;
export type ProductSummary = ProductList['products'][number];
export type Filters = ResponseOf<'/v1/catalog/filters', 'get'>;
export type Facet = Filters['facets'][number];
export type Collection = ResponseOf<'/v1/catalog/collections/{slug}', 'get'>;

export function useMenu() {
  const { lang } = useI18n();
  return useQuery({ queryKey: ['catalog', 'menu', lang], queryFn: ({ signal }) => apiFetch<Menu>('/v1/catalog/menu', { withLang: true, signal }), staleTime: 5 * 60_000 });
}

export function useBranches() {
  const { lang } = useI18n();
  return useQuery({ queryKey: ['branches', lang], queryFn: ({ signal }) => apiFetch<Branches>('/v1/branches', { withLang: true, signal }), staleTime: 10 * 60_000 });
}

/** API listing query (filters, sort, search) without paging. */
export type ListingQuery = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 24;

/**
 * Paged products. A deep link to page N loads up to two pages in the first request (pageSize 48, the API's
 * maximum), then continues page by page; Back from deep pages lands on the first 48 with "Load more".
 */
export function useProducts(query: ListingQuery, initialPages = 1, path: '/v1/catalog/products' | '/v1/search' = '/v1/catalog/products') {
  const { lang } = useI18n();
  const first = Math.min(Math.max(initialPages, 1), 2);
  return useInfiniteQuery({
    queryKey: ['catalog', 'products', path, lang, query, first],
    initialPageParam: { page: 1, pageSize: PAGE_SIZE * first },
    queryFn: ({ pageParam, signal }) => apiFetch<ProductList>(path, { query: { ...query, ...pageParam }, withLang: true, signal }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.products.length, 0);
      if (loaded >= last.total || last.products.length === 0) return undefined;
      return { page: Math.floor(loaded / PAGE_SIZE) + 1, pageSize: PAGE_SIZE };
    },
    placeholderData: keepPreviousData,
  });
}

export function useFilters(query: ListingQuery) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['catalog', 'filters', lang, query],
    queryFn: ({ signal }) => apiFetch<Filters>('/v1/catalog/filters', { query, withLang: true, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useCollection(slug: string | undefined) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['catalog', 'collection', slug, lang],
    queryFn: ({ signal }) => apiFetch<Collection>(`/v1/catalog/collections/${encodeURIComponent(slug!)}`, { withLang: true, signal }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export type Home = ResponseOf<'/v1/catalog/home', 'get'>;
export type HomeSection = Home['sections'][number];

export function useHome() {
  const { lang } = useI18n();
  return useQuery({ queryKey: ['catalog', 'home', lang], queryFn: ({ signal }) => apiFetch<Home>('/v1/catalog/home', { withLang: true, signal }) });
}

export type Suggest = ResponseOf<'/v1/search/suggest', 'get'>;

export function useSuggest(q: string) {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['catalog', 'suggest', lang, q],
    queryFn: ({ signal }) => apiFetch<Suggest>('/v1/search/suggest', { query: { q }, withLang: true, signal }),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

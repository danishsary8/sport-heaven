import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ResponseOf } from '../../lib/api';
import type { Lang } from '../../lib/i18n';

export type Provinces = ResponseOf<'/v1/geo/provinces', 'get'>;
export type Districts = ResponseOf<'/v1/geo/districts', 'get'>;
export type Communes = ResponseOf<'/v1/geo/communes', 'get'>;

const DAY = 24 * 60 * 60_000;

export function useProvinces() {
  return useQuery({ queryKey: ['geo', 'provinces'], queryFn: ({ signal }) => apiFetch<Provinces>('/v1/geo/provinces', { signal }), staleTime: DAY });
}

export function useDistricts(province: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'districts', province],
    queryFn: ({ signal }) => apiFetch<Districts>('/v1/geo/districts', { query: { provinceCode: province }, signal }),
    enabled: !!province,
    staleTime: DAY,
  });
}

export function useCommunes(district: string | undefined) {
  return useQuery({
    queryKey: ['geo', 'communes', district],
    queryFn: ({ signal }) => apiFetch<Communes>('/v1/geo/communes', { query: { districtCode: district }, signal }),
    enabled: !!district,
    staleTime: DAY,
  });
}

export const placeName = (p: { nameEn: string; nameKm: string }, lang: Lang) => (lang === 'km' ? p.nameKm : p.nameEn);

import { apiFetch } from '../../../lib/api';
import type { SystemHealthMetricsResponse } from './types';

export function fetchSystemHealthMetrics(params: { limit?: number; thresholdMs?: number; probe?: boolean } = {}): Promise<SystemHealthMetricsResponse> {
  return apiFetch<SystemHealthMetricsResponse>('/v1/admin/system-health/metrics', { query: params });
}

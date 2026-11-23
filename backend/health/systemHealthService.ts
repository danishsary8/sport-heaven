import { createPool, db } from '../../src/db/index.ts';
import { users } from '../../src/db/schema.ts';
import {
  buildHourlyAverageLatencySeries,
  buildHourlyLatencyHistogram,
  buildLatencyTrendSeries,
  buildUptime24hSeries,
  calculateAvailabilityPercent,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  DEFAULT_METRICS_LIMIT,
  evaluateLatencyAlert,
  formatUptimeDuration,
  MAX_METRICS_LIMIT,
  sanitizeLatencyThresholdMs,
  sanitizeMetricsLimit,
  summarizeLatencyMetrics,
  type DatabaseHealthDetails,
  type HealthCheckSample,
  type SystemHealthMetricsResponse,
  type SystemHealthSnapshot,
} from './systemHealthTypes.ts';

const SERVER_STARTED_AT = new Date();
const MAX_HISTORY_SAMPLES = MAX_METRICS_LIMIT;
const MAX_24H_HISTORY_SAMPLES = 5_000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_RECENT_CHECKS_LIMIT = 20;
const probeHistory: HealthCheckSample[] = [];
const uptime24hHistory: HealthCheckSample[] = [];

export interface DatabaseProbeResult {
  connected: boolean;
  latencyMs: number | null;
  message: string;
}

export type DatabaseProbeFn = () => Promise<DatabaseProbeResult>;

/**
 * Executes a lightweight, type-safe Drizzle ORM query against Cloud SQL
 * strictly on-demand when a health check request is received.
 * Follows two-layer error handling so raw database errors never leak to clients.
 */
export async function probeCloudSqlConnection(): Promise<DatabaseProbeResult> {
  const startedAt = performance.now();
  try {
    await db.select({ uid: users.uid }).from(users).limit(1);
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    return {
      connected: true,
      latencyMs,
      message: 'Cloud SQL PostgreSQL instance responding normally.',
    };
  } catch (error) {
    console.error('[SystemHealth] Cloud SQL connectivity check failed:', error);
    return {
      connected: false,
      latencyMs: null,
      message: 'Unable to reach the Cloud SQL database instance.',
    };
  }
}

function record24hUptimeSample(
  sample: HealthCheckSample,
  nowMs: number,
  store: HealthCheckSample[] = uptime24hHistory,
): HealthCheckSample[] {
  store.push(sample);
  const cutoffMs = nowMs - TWENTY_FOUR_HOURS_MS;
  while (store.length > 0) {
    const ts = Date.parse(store[0].checkedAt);
    if (!Number.isNaN(ts) && ts < cutoffMs) {
      store.shift();
    } else {
      break;
    }
  }
  if (store.length > MAX_24H_HISTORY_SAMPLES) {
    store.splice(0, store.length - MAX_24H_HISTORY_SAMPLES);
  }
  return [...store];
}

export function recordHealthSample(
  sample: HealthCheckSample,
  historyStore: HealthCheckSample[] = probeHistory,
): HealthCheckSample[] {
  historyStore.push(sample);
  if (historyStore.length > MAX_HISTORY_SAMPLES) {
    historyStore.splice(0, historyStore.length - MAX_HISTORY_SAMPLES);
  }
  return [...historyStore];
}

export function clearHealthHistory(): void {
  probeHistory.length = 0;
  uptime24hHistory.length = 0;
}

export async function getSystemHealthSnapshot(options?: {
  probeDatabase?: DatabaseProbeFn;
  recordInHistory?: boolean;
  now?: Date;
}): Promise<SystemHealthSnapshot> {
  const now = options?.now ?? new Date();
  const probeFn = options?.probeDatabase ?? probeCloudSqlConnection;
  const shouldRecord = options?.recordInHistory ?? true;

  const dbProbe = await probeFn();
  const pool = createPool();
  const mem = process.memoryUsage();

  const uptimeSeconds = Math.max(
    0,
    Math.floor((now.getTime() - SERVER_STARTED_AT.getTime()) / 1000),
  );

  const database: DatabaseHealthDetails = {
    engine: 'PostgreSQL (Cloud SQL)',
    status: dbProbe.connected ? 'connected' : 'disconnected',
    latencyMs: dbProbe.latencyMs,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
    message: dbProbe.message,
  };

  const overallStatus = dbProbe.connected ? 'operational' : 'degraded';

  const currentSample: HealthCheckSample = {
    checkedAt: now.toISOString(),
    status: overallStatus,
    databaseStatus: database.status,
    latencyMs: database.latencyMs,
    message: dbProbe.message,
  };

  const fullHistory = shouldRecord
    ? recordHealthSample(currentSample)
    : [...probeHistory, currentSample].slice(-MAX_HISTORY_SAMPLES);
  const history24h = shouldRecord
    ? record24hUptimeSample(currentSample, now.getTime())
    : [...uptime24hHistory, currentSample];
  const recentChecks = fullHistory.slice(-SNAPSHOT_RECENT_CHECKS_LIMIT);
  const uptime24h = buildUptime24hSeries(history24h, now);
  const hourlyLatency = buildHourlyAverageLatencySeries(history24h, now);
  const hourlyLatencyHistogram = buildHourlyLatencyHistogram(history24h, now);

  return {
    service: 'sport-castle-backend',
    overallStatus,
    checkedAt: now.toISOString(),
    startedAt: SERVER_STARTED_AT.toISOString(),
    uptimeSeconds,
    uptimeFormatted: formatUptimeDuration(uptimeSeconds),
    availabilityPercent: calculateAvailabilityPercent(recentChecks),
    database,
    runtime: {
      nodeVersion: process.version,
      memoryRssMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10,
    },
    recentChecks,
    uptime24h,
    hourlyLatency,
    hourlyLatencyHistogram,
  };
}

/**
 * Returns structured Cloud SQL database latency trend series and summary percentiles
 * for real-time Recharts visualization at GET /api/system-health/metrics.
 */
export async function getSystemHealthMetricsSnapshot(options?: {
  probeDatabase?: DatabaseProbeFn;
  limit?: number;
  thresholdMs?: number;
  probe?: boolean;
  now?: Date;
}): Promise<SystemHealthMetricsResponse> {
  const safeLimit = sanitizeMetricsLimit(options?.limit, DEFAULT_METRICS_LIMIT);
  const safeThreshold = sanitizeLatencyThresholdMs(
    options?.thresholdMs,
    DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  );
  const shouldProbe = options?.probe !== false || probeHistory.length === 0;

  let checkedAt = (options?.now ?? new Date()).toISOString();
  let overallStatus: SystemHealthMetricsResponse['overallStatus'] = 'operational';
  let databaseStatus: SystemHealthMetricsResponse['databaseStatus'] = 'connected';
  let latestLatencyMs: number | null = null;
  let poolStats = { total: 0, idle: 0, waiting: 0 };

  if (shouldProbe) {
    const snapshot = await getSystemHealthSnapshot({
      probeDatabase: options?.probeDatabase,
      recordInHistory: true,
      now: options?.now,
    });
    checkedAt = snapshot.checkedAt;
    overallStatus = snapshot.overallStatus;
    databaseStatus = snapshot.database.status;
    latestLatencyMs = snapshot.database.latencyMs;
    poolStats = snapshot.database.pool;
  } else {
    const pool = createPool();
    poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
    const latestSample = probeHistory[probeHistory.length - 1];
    if (latestSample) {
      checkedAt = latestSample.checkedAt;
      overallStatus = latestSample.status;
      databaseStatus = latestSample.databaseStatus;
      latestLatencyMs = latestSample.latencyMs;
    }
  }

  const windowedSamples = probeHistory.slice(-safeLimit);
  const series = buildLatencyTrendSeries(windowedSamples, safeThreshold);
  const summary = summarizeLatencyMetrics(windowedSamples, safeThreshold);
  const alert = evaluateLatencyAlert(
    latestLatencyMs,
    safeThreshold,
    databaseStatus,
  );

  return {
    service: 'sport-castle-backend',
    engine: 'PostgreSQL (Cloud SQL)',
    overallStatus,
    databaseStatus,
    checkedAt,
    thresholdMs: safeThreshold,
    alert,
    pool: poolStats,
    summary,
    series,
  };
}

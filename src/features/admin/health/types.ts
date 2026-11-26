export type ServiceStatus = 'operational' | 'degraded' | 'offline';
export type DatabaseConnectionStatus = 'connected' | 'disconnected';

export interface HealthCheckSample {
  checkedAt: string;
  status: ServiceStatus;
  databaseStatus: DatabaseConnectionStatus;
  latencyMs: number | null;
  message?: string;
}

export interface ConnectionAttemptLogEntry {
  sequenceNumber: number;
  checkedAt: string;
  status: ServiceStatus;
  databaseStatus: DatabaseConnectionStatus;
  latencyMs: number | null;
  message: string;
  isLatest: boolean;
}

export interface DatabaseHealthDetails {
  engine: string;
  status: DatabaseConnectionStatus;
  latencyMs: number | null;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  message: string;
}

export interface RuntimeHealthDetails {
  nodeVersion: string;
  memoryRssMb: number;
  heapUsedMb: number;
}

export interface SystemHealthSnapshot {
  service: string;
  overallStatus: ServiceStatus;
  checkedAt: string;
  startedAt: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  availabilityPercent: number;
  database: DatabaseHealthDetails;
  runtime: RuntimeHealthDetails;
  recentChecks: HealthCheckSample[];
  uptime24h?: Uptime24hSeries;
  hourlyLatency?: HourlyLatencySeries;
  hourlyLatencyHistogram?: LatencyHistogramSeries;
}

export function formatUptimeDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function calculateAvailabilityPercent(
  samples: readonly HealthCheckSample[],
): number {
  if (samples.length === 0) return 100;
  const healthyCount = samples.filter(
    (sample) =>
      sample.status === 'operational' && sample.databaseStatus === 'connected',
  ).length;
  return Number(((healthyCount / samples.length) * 100).toFixed(1));
}

export function formatLatencyMs(latencyMs: number | null): string {
  if (latencyMs === null || !Number.isFinite(latencyMs)) {
    return '—';
  }
  return `${Math.max(0, Math.round(latencyMs))} ms`;
}

/**
 * Returns the last `limit` (default 5) Cloud SQL connection attempts in
 * chronological order (oldest -> most recent) with stable sequence numbers
 * and sanitized diagnostic summaries.
 */
export function getRecentConnectionAttemptLogs(
  samples: readonly HealthCheckSample[],
  limit = 5,
): ConnectionAttemptLogEntry[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (samples.length === 0 || safeLimit === 0) return [];

  const indexed = samples.map((sample, originalIndex) => {
    const parsedTime = Date.parse(sample.checkedAt);
    return {
      sample,
      originalIndex,
      sortKey: Number.isNaN(parsedTime) ? originalIndex : parsedTime,
    };
  });

  indexed.sort((a, b) =>
    a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.originalIndex - b.originalIndex,
  );

  const totalCount = indexed.length;
  const startIndex = Math.max(0, totalCount - safeLimit);
  const windowSlice = indexed.slice(startIndex);

  return windowSlice.map(({ sample }, idx) => {
    const fallbackMessage =
      sample.databaseStatus === 'connected'
        ? 'Cloud SQL PostgreSQL instance responding normally.'
        : 'Unable to reach the Cloud SQL database instance.';

    return {
      sequenceNumber: startIndex + idx + 1,
      checkedAt: sample.checkedAt,
      status: sample.status,
      databaseStatus: sample.databaseStatus,
      latencyMs: sample.latencyMs,
      message: sample.message?.trim() || fallbackMessage,
      isLatest: idx === windowSlice.length - 1,
    };
  });
}

export const DEFAULT_LATENCY_ALERT_THRESHOLD_MS = 500;
export const MIN_LATENCY_ALERT_THRESHOLD_MS = 10;
export const MAX_LATENCY_ALERT_THRESHOLD_MS = 10_000;
export const LATENCY_THRESHOLD_PRESETS_MS = [100, 250, 500, 1000] as const;

export type LatencyAlertSeverity = 'normal' | 'high-latency' | 'unavailable';

export interface LatencyAlertEvaluation {
  severity: LatencyAlertSeverity;
  isAlertActive: boolean;
  thresholdMs: number;
  latencyMs: number | null;
  excessMs: number;
  badgeLabel: string;
  summaryMessage: string;
}

export function sanitizeLatencyThresholdMs(
  rawValue: number | string | null | undefined,
  fallback = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): number {
  const safeFallback = Math.min(
    MAX_LATENCY_ALERT_THRESHOLD_MS,
    Math.max(MIN_LATENCY_ALERT_THRESHOLD_MS, Math.round(fallback)),
  );
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return safeFallback;
  }
  const parsed = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }
  return Math.min(
    MAX_LATENCY_ALERT_THRESHOLD_MS,
    Math.max(MIN_LATENCY_ALERT_THRESHOLD_MS, Math.round(parsed)),
  );
}

/**
 * Evaluates a Cloud SQL probe round-trip latency against the configured
 * alert threshold (default 500ms) and returns structured status badge metadata.
 */
export function evaluateLatencyAlert(
  latencyMs: number | null,
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  databaseStatus: DatabaseConnectionStatus = 'connected',
): LatencyAlertEvaluation {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);

  if (
    databaseStatus === 'disconnected' ||
    latencyMs === null ||
    !Number.isFinite(latencyMs)
  ) {
    return {
      severity: 'unavailable',
      isAlertActive: true,
      thresholdMs: safeThreshold,
      latencyMs: null,
      excessMs: 0,
      badgeLabel: 'DB Unreachable',
      summaryMessage: 'Cloud SQL response time unavailable while disconnected.',
    };
  }

  const roundedLatency = Math.max(0, Math.round(latencyMs));
  if (roundedLatency > safeThreshold) {
    const excessMs = roundedLatency - safeThreshold;
    return {
      severity: 'high-latency',
      isAlertActive: true,
      thresholdMs: safeThreshold,
      latencyMs: roundedLatency,
      excessMs,
      badgeLabel: `High Latency (>${safeThreshold}ms)`,
      summaryMessage: `Cloud SQL response time (${roundedLatency} ms) exceeded the ${safeThreshold} ms alert threshold by +${excessMs} ms.`,
    };
  }

  return {
    severity: 'normal',
    isAlertActive: false,
    thresholdMs: safeThreshold,
    latencyMs: roundedLatency,
    excessMs: 0,
    badgeLabel: `Within Threshold (≤${safeThreshold}ms)`,
    summaryMessage: `Cloud SQL response time (${roundedLatency} ms) is within the ${safeThreshold} ms alert threshold.`,
  };
}

export function countLatencyThresholdBreaches(
  samples: readonly HealthCheckSample[],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): number {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  return samples.filter(
    (sample) =>
      sample.databaseStatus === 'connected' &&
      sample.latencyMs !== null &&
      Number.isFinite(sample.latencyMs) &&
      Math.round(sample.latencyMs) > safeThreshold,
  ).length;
}

export const DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS = 800;
export const MIN_CRITICAL_LATENCY_THRESHOLD_MS = 10;
export const MAX_CRITICAL_LATENCY_THRESHOLD_MS = 10_000;

export type ChartPointLatencyTier = 'nominal' | 'warning' | 'critical';

export function sanitizeCriticalLatencyThresholdMs(
  rawValue: number | string | null | undefined,
  fallback = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
): number {
  return sanitizeLatencyThresholdMs(rawValue, fallback);
}

/**
 * Returns true when a numeric latency reading strictly exceeds the configured
 * Critical Latency threshold (ms).
 */
export function isCriticalLatency(
  latencyMs: number | null | undefined,
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
): boolean {
  if (latencyMs === null || latencyMs === undefined || !Number.isFinite(latencyMs)) {
    return false;
  }
  const safeCritical = sanitizeCriticalLatencyThresholdMs(criticalThresholdMs);
  return Math.round(latencyMs) > safeCritical;
}

/**
 * Classifies a single chart data point against both the standard Alert/Warning
 * threshold and the admin-configured Critical Latency threshold. Critical always
 * takes visual precedence over Warning when both are exceeded.
 */
export function classifyChartPointLatencyTier(
  latencyMs: number | null | undefined,
  warningThresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
): ChartPointLatencyTier {
  if (latencyMs === null || latencyMs === undefined || !Number.isFinite(latencyMs)) {
    return 'nominal';
  }
  if (isCriticalLatency(latencyMs, criticalThresholdMs)) {
    return 'critical';
  }
  const safeWarning = sanitizeLatencyThresholdMs(warningThresholdMs);
  if (Math.round(latencyMs) > safeWarning) {
    return 'warning';
  }
  return 'nominal';
}

export function countCriticalLatencyPoints(
  latencies: readonly (number | null | undefined)[],
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
): number {
  const safeCritical = sanitizeCriticalLatencyThresholdMs(criticalThresholdMs);
  return latencies.filter((ms) => isCriticalLatency(ms, safeCritical)).length;
}

export type SystemHealthAlertType =
  | 'latency'
  | 'downtime'
  | 'connectionFailure';

export interface SystemHealthAlertPreferences {
  latency: boolean;
  downtime: boolean;
  connectionFailure: boolean;
}

export const DEFAULT_HEALTH_ALERT_PREFERENCES: SystemHealthAlertPreferences = {
  latency: true,
  downtime: true,
  connectionFailure: true,
};

export interface HealthAlertChannelMeta {
  key: SystemHealthAlertType;
  label: string;
  shortLabel: string;
  description: string;
}

export const HEALTH_ALERT_CHANNELS: readonly HealthAlertChannelMeta[] = [
  {
    key: 'latency',
    label: 'Latency Alerts',
    shortLabel: 'Latency',
    description: 'High-latency banner & toast when query latency exceeds limit',
  },
  {
    key: 'downtime',
    label: 'Downtime Alerts',
    shortLabel: 'Downtime',
    description: 'Service degradation or SLA availability drops below 99.9%',
  },
  {
    key: 'connectionFailure',
    label: 'Connection Failure',
    shortLabel: 'Connection Failure',
    description: 'Cloud SQL disconnects or unreachable health API endpoints',
  },
] as const;

export function sanitizeHealthAlertPreferences(
  raw: unknown,
  fallback: SystemHealthAlertPreferences = DEFAULT_HEALTH_ALERT_PREFERENCES,
): SystemHealthAlertPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }
  const obj = raw as Record<string, unknown>;
  return {
    latency:
      typeof obj.latency === 'boolean' ? obj.latency : fallback.latency,
    downtime:
      typeof obj.downtime === 'boolean' ? obj.downtime : fallback.downtime,
    connectionFailure:
      typeof obj.connectionFailure === 'boolean'
        ? obj.connectionFailure
        : fallback.connectionFailure,
  };
}

export function countEnabledAlertPreferences(
  prefs: SystemHealthAlertPreferences,
): number {
  return (
    (prefs.latency ? 1 : 0) +
    (prefs.downtime ? 1 : 0) +
    (prefs.connectionFailure ? 1 : 0)
  );
}

export interface ActiveSystemHealthAlert {
  type: SystemHealthAlertType;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  badgeText: string;
}

export interface EvaluateSystemHealthAlertsInput {
  overallStatus?: ServiceStatus;
  databaseStatus?: DatabaseConnectionStatus;
  latencyMs?: number | null;
  latencyThresholdMs?: number;
  availabilityPercent?: number;
  endpointError?: string | null;
}

export interface EvaluatedSystemHealthAlerts {
  activeAlerts: ActiveSystemHealthAlert[];
  suppressedTypes: SystemHealthAlertType[];
}

export const SLA_AVAILABILITY_ALERT_FLOOR_PERCENT = 99.9;

/**
 * Evaluates all current health signals (latency, downtime/SLA, connection
 * failure) and partitions them into active alerts vs. admin-muted alert types.
 */
export function evaluateSystemHealthAlerts(
  input: EvaluateSystemHealthAlertsInput,
  preferences: SystemHealthAlertPreferences = DEFAULT_HEALTH_ALERT_PREFERENCES,
): EvaluatedSystemHealthAlerts {
  const candidates: ActiveSystemHealthAlert[] = [];

  // 1. Connection Failure (DB disconnected or health endpoint unreachable)
  const hasEndpointError = Boolean(input.endpointError && input.endpointError.trim());
  const isDbDisconnected = input.databaseStatus === 'disconnected';
  if (hasEndpointError || isDbDisconnected) {
    candidates.push({
      type: 'connectionFailure',
      severity: 'critical',
      title: hasEndpointError
        ? 'Health Endpoint Unreachable'
        : 'Cloud SQL Connection Failure',
      message: hasEndpointError
        ? (input.endpointError as string)
        : 'Cloud SQL PostgreSQL instance is disconnected and not responding to live probes.',
      badgeText: hasEndpointError ? 'API Unreachable' : 'DB Disconnected',
    });
  }

  // 2. Downtime / Availability Degradation
  const isDegradedService =
    input.overallStatus !== undefined && input.overallStatus !== 'operational';
  const hasLowAvailability =
    typeof input.availabilityPercent === 'number' &&
    Number.isFinite(input.availabilityPercent) &&
    input.availabilityPercent < SLA_AVAILABILITY_ALERT_FLOOR_PERCENT;
  if (isDegradedService || hasLowAvailability) {
    const availText =
      typeof input.availabilityPercent === 'number' &&
      Number.isFinite(input.availabilityPercent)
        ? `${input.availabilityPercent.toFixed(1)}%`
        : 'Degraded';
    candidates.push({
      type: 'downtime',
      severity: 'critical',
      title: isDegradedService
        ? 'Service Downtime Detected'
        : 'Availability Below 99.9% SLA',
      message: isDegradedService
        ? `System health status is currently ${input.overallStatus} with ${availText} observed availability.`
        : `Observed service availability (${availText}) dropped below the ${SLA_AVAILABILITY_ALERT_FLOOR_PERCENT}% SLA target.`,
      badgeText: `Availability ${availText}`,
    });
  }

  // 3. Latency Threshold Exceeded (only when DB is connected)
  if (!isDbDisconnected && input.latencyMs !== undefined && input.latencyMs !== null) {
    const latencyEval = evaluateLatencyAlert(
      input.latencyMs,
      input.latencyThresholdMs ?? DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
      'connected',
    );
    if (latencyEval.severity === 'high-latency') {
      candidates.push({
        type: 'latency',
        severity: 'warning',
        title: 'Latency Threshold Exceeded',
        message: latencyEval.summaryMessage,
        badgeText: `+${latencyEval.excessMs} ms over ${latencyEval.thresholdMs} ms`,
      });
    }
  }

  const activeAlerts: ActiveSystemHealthAlert[] = [];
  const suppressedTypes: SystemHealthAlertType[] = [];

  for (const alert of candidates) {
    if (preferences[alert.type]) {
      activeAlerts.push(alert);
    } else {
      suppressedTypes.push(alert.type);
    }
  }

  return { activeAlerts, suppressedTypes };
}

export const DEFAULT_METRICS_LIMIT = 30;
export const MIN_METRICS_LIMIT = 5;
export const MAX_METRICS_LIMIT = 60;

export interface LatencyTrendPoint {
  index: number;
  checkedAt: string;
  timeLabel: string;
  latencyMs: number | null;
  rollingAvgMs: number | null;
  databaseStatus: DatabaseConnectionStatus;
  status: ServiceStatus;
  exceedsThreshold: boolean;
}

export interface LatencyMetricsSummary {
  sampleCount: number;
  connectedCount: number;
  disconnectedCount: number;
  currentMs: number | null;
  averageMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  p95Ms: number | null;
  thresholdBreaches: number;
  availabilityPercent: number;
}

export interface SystemHealthMetricsResponse {
  service: string;
  engine: string;
  overallStatus: ServiceStatus;
  databaseStatus: DatabaseConnectionStatus;
  checkedAt: string;
  thresholdMs: number;
  alert: LatencyAlertEvaluation;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  summary: LatencyMetricsSummary;
  series: LatencyTrendPoint[];
}

export function sanitizeMetricsLimit(
  rawValue: number | string | null | undefined,
  fallback = DEFAULT_METRICS_LIMIT,
): number {
  const safeFallback = Math.min(
    MAX_METRICS_LIMIT,
    Math.max(MIN_METRICS_LIMIT, Math.round(fallback)),
  );
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return safeFallback;
  }
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }
  return Math.min(
    MAX_METRICS_LIMIT,
    Math.max(MIN_METRICS_LIMIT, Math.round(parsed)),
  );
}

export function formatShortClockLabel(iso: string): string {
  const tIndex = iso.indexOf('T');
  if (tIndex !== -1 && iso.length >= tIndex + 9) {
    return iso.slice(tIndex + 1, tIndex + 9);
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toISOString().slice(11, 19);
}

export function calculatePercentile(
  values: readonly number[],
  percentile: number,
): number | null {
  const finiteValues = values
    .filter((v) => Number.isFinite(v))
    .map((v) => Math.max(0, Math.round(v)));
  if (finiteValues.length === 0) return null;

  finiteValues.sort((a, b) => a - b);
  const clampedP = Math.min(100, Math.max(0, percentile));
  const rank = Math.ceil((clampedP / 100) * finiteValues.length) - 1;
  const idx = Math.min(finiteValues.length - 1, Math.max(0, rank));
  return finiteValues[idx];
}

/**
 * Builds chronological Recharts-ready time-series points with rolling moving average
 * and threshold breach flags.
 */
export function buildLatencyTrendSeries(
  samples: readonly HealthCheckSample[],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  rollingWindow = 3,
): LatencyTrendPoint[] {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  const safeWindow = Math.max(1, Math.floor(rollingWindow));

  const ordered = samples
    .map((sample, originalIndex) => {
      const parsedTime = Date.parse(sample.checkedAt);
      return {
        sample,
        originalIndex,
        sortKey: Number.isNaN(parsedTime) ? originalIndex : parsedTime,
      };
    })
    .sort((a, b) =>
      a.sortKey !== b.sortKey
        ? a.sortKey - b.sortKey
        : a.originalIndex - b.originalIndex,
    )
    .map((item) => item.sample);

  const recentConnectedLatencies: number[] = [];

  return ordered.map((sample, idx) => {
    const isConnected =
      sample.databaseStatus === 'connected' &&
      sample.latencyMs !== null &&
      Number.isFinite(sample.latencyMs);
    const roundedLatency = isConnected
      ? Math.max(0, Math.round(sample.latencyMs as number))
      : null;

    if (roundedLatency !== null) {
      recentConnectedLatencies.push(roundedLatency);
      if (recentConnectedLatencies.length > safeWindow) {
        recentConnectedLatencies.shift();
      }
    }

    const rollingAvgMs =
      recentConnectedLatencies.length > 0
        ? Math.round(
            recentConnectedLatencies.reduce((sum, val) => sum + val, 0) /
              recentConnectedLatencies.length,
          )
        : null;

    return {
      index: idx + 1,
      checkedAt: sample.checkedAt,
      timeLabel: formatShortClockLabel(sample.checkedAt),
      latencyMs: roundedLatency,
      rollingAvgMs,
      databaseStatus: sample.databaseStatus,
      status: sample.status,
      exceedsThreshold:
        roundedLatency !== null && roundedLatency > safeThreshold,
    };
  });
}

export function summarizeLatencyMetrics(
  samples: readonly HealthCheckSample[],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): LatencyMetricsSummary {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  const connectedLatencies = samples
    .filter(
      (sample) =>
        sample.databaseStatus === 'connected' &&
        sample.latencyMs !== null &&
        Number.isFinite(sample.latencyMs),
    )
    .map((sample) => Math.max(0, Math.round(sample.latencyMs as number)));

  const connectedCount = samples.filter(
    (sample) => sample.databaseStatus === 'connected',
  ).length;
  const disconnectedCount = samples.length - connectedCount;

  const latest = samples.length > 0 ? samples[samples.length - 1] : null;
  const currentMs =
    latest &&
    latest.databaseStatus === 'connected' &&
    latest.latencyMs !== null &&
    Number.isFinite(latest.latencyMs)
      ? Math.max(0, Math.round(latest.latencyMs))
      : null;

  const averageMs =
    connectedLatencies.length > 0
      ? Math.round(
          connectedLatencies.reduce((sum, val) => sum + val, 0) /
            connectedLatencies.length,
        )
      : null;
  const minMs =
    connectedLatencies.length > 0 ? Math.min(...connectedLatencies) : null;
  const maxMs =
    connectedLatencies.length > 0 ? Math.max(...connectedLatencies) : null;
  const p95Ms = calculatePercentile(connectedLatencies, 95);

  return {
    sampleCount: samples.length,
    connectedCount,
    disconnectedCount,
    currentMs,
    averageMs,
    minMs,
    maxMs,
    p95Ms,
    thresholdBreaches: countLatencyThresholdBreaches(samples, safeThreshold),
    availabilityPercent: calculateAvailabilityPercent(samples),
  };
}

/**
 * Escapes a single CSV cell per RFC 4180 and neutralizes leading spreadsheet
 * formula triggers (=, +, -, @, tab, CR) so exported logs are safe in Excel/Sheets.
 */
export function escapeCsvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '';
  }
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serializes up to the last 5 chronological Cloud SQL connection attempt logs
 * into a downloadable RFC-4180 CSV document.
 */
export function buildConnectionLogsCsv(
  entries: readonly ConnectionAttemptLogEntry[],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): string {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  const lastFive = entries.slice(-5);

  const header = [
    'Attempt',
    'Timestamp (ISO)',
    'Service Status',
    'Database Status',
    'Latency (ms)',
    'Threshold (ms)',
    'Exceeds Threshold',
    'Diagnostic Output',
  ];

  const rows = lastFive.map((entry) => {
    const isConnected = entry.databaseStatus === 'connected';
    const hasLatency =
      isConnected &&
      entry.latencyMs !== null &&
      Number.isFinite(entry.latencyMs);
    const roundedLatency = hasLatency
      ? Math.max(0, Math.round(entry.latencyMs as number))
      : null;
    const exceedsThresholdLabel = !isConnected
      ? 'N/A'
      : roundedLatency !== null && roundedLatency > safeThreshold
        ? 'Yes'
        : 'No';

    return [
      `#${String(entry.sequenceNumber).padStart(2, '0')}`,
      entry.checkedAt,
      entry.status,
      entry.databaseStatus,
      roundedLatency !== null ? roundedLatency : '',
      safeThreshold,
      exceedsThresholdLabel,
      entry.message,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [header.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

export function buildConnectionLogsCsvFilename(now: Date = new Date()): string {
  const isoStamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, '-');
  return `cloud-sql-connection-logs-${isoStamp}Z.csv`;
}

export const DEFAULT_ANOMALY_STD_MULTIPLIER = 1.5;
export const MIN_ANOMALY_STD_MULTIPLIER = 1.0;
export const MAX_ANOMALY_STD_MULTIPLIER = 4.0;
export const ANOMALY_SENSITIVITY_PRESETS = [1.5, 2, 2.5] as const;

export interface LatencyAnomalyStats {
  sampleCount: number;
  meanMs: number | null;
  stdDevMs: number | null;
  upperFenceMs: number | null;
  multiplier: number;
  anomalyCount: number;
  hasEnoughSamples: boolean;
}

export interface LatencyTrendPointWithAnomaly extends LatencyTrendPoint {
  isAnomaly: boolean;
  zScore: number | null;
}

export function sanitizeAnomalyMultiplier(
  rawValue: number | string | null | undefined,
  fallback = DEFAULT_ANOMALY_STD_MULTIPLIER,
): number {
  const safeFallback = Math.min(
    MAX_ANOMALY_STD_MULTIPLIER,
    Math.max(MIN_ANOMALY_STD_MULTIPLIER, Number(fallback.toFixed(2))),
  );
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return safeFallback;
  }
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }
  return Math.min(
    MAX_ANOMALY_STD_MULTIPLIER,
    Math.max(MIN_ANOMALY_STD_MULTIPLIER, Number(parsed.toFixed(2))),
  );
}

/**
 * Applies a standard-deviation statistical heuristic (latency > mean + k * σ)
 * across connected latency samples to flag latency spikes for Recharts highlighting.
 * Requires at least 3 connected samples and non-zero dispersion (σ > 0) to avoid false alarms.
 */
export function detectLatencyAnomalies(
  series: readonly LatencyTrendPoint[],
  multiplier = DEFAULT_ANOMALY_STD_MULTIPLIER,
): {
  stats: LatencyAnomalyStats;
  points: LatencyTrendPointWithAnomaly[];
} {
  const safeMultiplier = sanitizeAnomalyMultiplier(multiplier);
  const validLatencies = series
    .filter(
      (pt) =>
        pt.databaseStatus === 'connected' &&
        pt.latencyMs !== null &&
        Number.isFinite(pt.latencyMs),
    )
    .map((pt) => Math.max(0, Math.round(pt.latencyMs as number)));

  const sampleCount = validLatencies.length;
  const hasEnoughSamples = sampleCount >= 3;

  if (sampleCount === 0) {
    return {
      stats: {
        sampleCount: 0,
        meanMs: null,
        stdDevMs: null,
        upperFenceMs: null,
        multiplier: safeMultiplier,
        anomalyCount: 0,
        hasEnoughSamples: false,
      },
      points: series.map((pt) => ({
        ...pt,
        isAnomaly: false,
        zScore: null,
      })),
    };
  }

  const mean =
    validLatencies.reduce((sum, val) => sum + val, 0) / sampleCount;
  const variance =
    validLatencies.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
    sampleCount;
  const stdDev = Math.sqrt(variance);
  const upperFence = mean + safeMultiplier * stdDev;

  let anomalyCount = 0;
  const points: LatencyTrendPointWithAnomaly[] = series.map((pt) => {
    const isConnected =
      pt.databaseStatus === 'connected' &&
      pt.latencyMs !== null &&
      Number.isFinite(pt.latencyMs);
    if (!isConnected || !hasEnoughSamples || stdDev <= 0) {
      return {
        ...pt,
        isAnomaly: false,
        zScore: isConnected && stdDev === 0 ? 0 : null,
      };
    }

    const latency = Math.max(0, Math.round(pt.latencyMs as number));
    const zScore = Number(((latency - mean) / stdDev).toFixed(2));
    const isAnomaly = latency > upperFence;
    if (isAnomaly) {
      anomalyCount += 1;
    }

    return {
      ...pt,
      isAnomaly,
      zScore,
    };
  });

  return {
    stats: {
      sampleCount,
      meanMs: Math.round(mean),
      stdDevMs: Number(stdDev.toFixed(1)),
      upperFenceMs: hasEnoughSamples ? Math.round(upperFence) : null,
      multiplier: safeMultiplier,
      anomalyCount,
      hasEnoughSamples,
    },
    points,
  };
}

export const DEFAULT_UPTIME_SLA_TARGET_PERCENT = 99.9;
export const UPTIME_WINDOW_HOURS = 24;

export type UptimeBucketStatus =
  | 'operational'
  | 'degraded'
  | 'incident'
  | 'no-data';

export interface UptimeHourlyBucket {
  hourIndex: number;
  hourStartIso: string;
  hourLabel: string;
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  uptimePercent: number | null;
  avgLatencyMs: number | null;
  isCurrentHour: boolean;
  status: UptimeBucketStatus;
}

export interface Uptime24hSummary {
  windowHours: 24;
  overallUptimePercent: number;
  slaTargetPercent: number;
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  hoursWithData: number;
  lowestBucketPercent: number | null;
  meetsSla: boolean;
}

export interface Uptime24hSeries {
  generatedAt: string;
  summary: Uptime24hSummary;
  buckets: UptimeHourlyBucket[];
}

function formatUtcHourLabel(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:00`;
}

/**
 * Aggregates health check samples into 24 chronological 1-hour UTC buckets
 * ending at the current UTC hour, calculating per-hour uptime percentage,
 * weighted 24-hour availability, lowest hourly bucket, and SLA compliance.
 */
export function buildUptime24hSeries(
  samples: readonly HealthCheckSample[],
  now: Date = new Date(),
  slaTargetPercent = DEFAULT_UPTIME_SLA_TARGET_PERCENT,
): Uptime24hSeries {
  const safeSlaTarget = Number.isFinite(slaTargetPercent)
    ? Math.min(100, Math.max(0, Number(slaTargetPercent.toFixed(2))))
    : DEFAULT_UPTIME_SLA_TARGET_PERCENT;

  const currentHourStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0,
    0,
    0,
  );
  const hourMs = 3_600_000;
  const windowStartMs = currentHourStartMs - (UPTIME_WINDOW_HOURS - 1) * hourMs;
  const windowEndMs = currentHourStartMs + hourMs;

  const accumulators = Array.from({ length: UPTIME_WINDOW_HOURS }, (_, idx) => {
    const startMs = windowStartMs + idx * hourMs;
    const startDate = new Date(startMs);
    return {
      hourIndex: idx,
      startMs,
      hourStartIso: startDate.toISOString(),
      hourLabel: formatUtcHourLabel(startDate),
      totalChecks: 0,
      healthyChecks: 0,
      degradedChecks: 0,
      latencySum: 0,
      latencyCount: 0,
      isCurrentHour: idx === UPTIME_WINDOW_HOURS - 1,
    };
  });

  for (const sample of samples) {
    const parsedMs = Date.parse(sample.checkedAt);
    if (
      Number.isNaN(parsedMs) ||
      parsedMs < windowStartMs ||
      parsedMs >= windowEndMs
    ) {
      continue;
    }
    const bucketIdx = Math.floor((parsedMs - windowStartMs) / hourMs);
    if (bucketIdx < 0 || bucketIdx >= UPTIME_WINDOW_HOURS) {
      continue;
    }

    const bucket = accumulators[bucketIdx];
    bucket.totalChecks += 1;
    const isHealthy =
      sample.status === 'operational' && sample.databaseStatus === 'connected';
    if (isHealthy) {
      bucket.healthyChecks += 1;
    } else {
      bucket.degradedChecks += 1;
    }

    if (
      sample.databaseStatus === 'connected' &&
      sample.latencyMs !== null &&
      Number.isFinite(sample.latencyMs)
    ) {
      bucket.latencySum += Math.max(0, Math.round(sample.latencyMs));
      bucket.latencyCount += 1;
    }
  }

  let totalChecks = 0;
  let healthyChecks = 0;
  let degradedChecks = 0;
  let hoursWithData = 0;
  let lowestBucketPercent: number | null = null;

  const buckets: UptimeHourlyBucket[] = accumulators.map((acc) => {
    if (acc.totalChecks === 0) {
      return {
        hourIndex: acc.hourIndex,
        hourStartIso: acc.hourStartIso,
        hourLabel: acc.hourLabel,
        totalChecks: 0,
        healthyChecks: 0,
        degradedChecks: 0,
        uptimePercent: null,
        avgLatencyMs: null,
        isCurrentHour: acc.isCurrentHour,
        status: 'no-data',
      };
    }

    totalChecks += acc.totalChecks;
    healthyChecks += acc.healthyChecks;
    degradedChecks += acc.degradedChecks;
    hoursWithData += 1;

    const uptimePercent = Number(
      ((acc.healthyChecks / acc.totalChecks) * 100).toFixed(1),
    );
    if (lowestBucketPercent === null || uptimePercent < lowestBucketPercent) {
      lowestBucketPercent = uptimePercent;
    }

    const status: UptimeBucketStatus =
      uptimePercent >= safeSlaTarget
        ? 'operational'
        : uptimePercent >= 95
          ? 'degraded'
          : 'incident';

    return {
      hourIndex: acc.hourIndex,
      hourStartIso: acc.hourStartIso,
      hourLabel: acc.hourLabel,
      totalChecks: acc.totalChecks,
      healthyChecks: acc.healthyChecks,
      degradedChecks: acc.degradedChecks,
      uptimePercent,
      avgLatencyMs:
        acc.latencyCount > 0
          ? Math.round(acc.latencySum / acc.latencyCount)
          : null,
      isCurrentHour: acc.isCurrentHour,
      status,
    };
  });

  const overallUptimePercent =
    totalChecks > 0
      ? Number(((healthyChecks / totalChecks) * 100).toFixed(1))
      : 100;

  return {
    generatedAt: now.toISOString(),
    summary: {
      windowHours: 24,
      overallUptimePercent,
      slaTargetPercent: safeSlaTarget,
      totalChecks,
      healthyChecks,
      degradedChecks,
      hoursWithData,
      lowestBucketPercent,
      meetsSla: overallUptimePercent >= safeSlaTarget,
    },
    buckets,
  };
}

export const HOURLY_LATENCY_WINDOW_MINUTES = 60;

export interface LatencyMinuteBucket {
  minuteIndex: number;
  minuteStartIso: string;
  minuteLabel: string;
  sampleCount: number;
  connectedCount: number;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  exceedsThreshold: boolean;
  isCurrentMinute: boolean;
}

export interface HourlyLatencySummary {
  windowMinutes: 60;
  overallAvgMs: number | null;
  minMinuteAvgMs: number | null;
  maxMinuteAvgMs: number | null;
  latestMinuteAvgMs: number | null;
  activeMinutes: number;
  totalSamples: number;
  breachedMinutes: number;
}

export interface HourlyLatencySeries {
  generatedAt: string;
  thresholdMs: number;
  summary: HourlyLatencySummary;
  buckets: LatencyMinuteBucket[];
}

function formatUtcMinuteLabel(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Aggregates health check samples into 60 chronological 1-minute UTC buckets
 * ending at the current UTC minute, computing average/min/max latency per minute
 * and overall 1-hour weighted latency summary for Recharts LineChart plotting.
 */
export function buildHourlyAverageLatencySeries(
  samples: readonly HealthCheckSample[],
  now: Date = new Date(),
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): HourlyLatencySeries {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  const minuteMs = 60_000;
  const currentMinuteStartMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    0,
    0,
  );
  const windowStartMs =
    currentMinuteStartMs - (HOURLY_LATENCY_WINDOW_MINUTES - 1) * minuteMs;
  const windowEndMs = currentMinuteStartMs + minuteMs;

  const accumulators = Array.from(
    { length: HOURLY_LATENCY_WINDOW_MINUTES },
    (_, idx) => {
      const startMs = windowStartMs + idx * minuteMs;
      const startDate = new Date(startMs);
      return {
        minuteIndex: idx,
        minuteStartIso: startDate.toISOString(),
        minuteLabel: formatUtcMinuteLabel(startDate),
        sampleCount: 0,
        connectedCount: 0,
        latencySum: 0,
        minLatencyMs: null as number | null,
        maxLatencyMs: null as number | null,
        isCurrentMinute: idx === HOURLY_LATENCY_WINDOW_MINUTES - 1,
      };
    },
  );

  let weightedLatencySum = 0;
  let weightedConnectedCount = 0;
  let totalSamples = 0;

  for (const sample of samples) {
    const parsedMs = Date.parse(sample.checkedAt);
    if (
      Number.isNaN(parsedMs) ||
      parsedMs < windowStartMs ||
      parsedMs >= windowEndMs
    ) {
      continue;
    }
    const bucketIdx = Math.floor((parsedMs - windowStartMs) / minuteMs);
    if (bucketIdx < 0 || bucketIdx >= HOURLY_LATENCY_WINDOW_MINUTES) {
      continue;
    }

    const bucket = accumulators[bucketIdx];
    bucket.sampleCount += 1;
    totalSamples += 1;

    if (
      sample.databaseStatus === 'connected' &&
      sample.latencyMs !== null &&
      Number.isFinite(sample.latencyMs)
    ) {
      const latency = Math.max(0, Math.round(sample.latencyMs));
      bucket.connectedCount += 1;
      bucket.latencySum += latency;
      bucket.minLatencyMs =
        bucket.minLatencyMs === null
          ? latency
          : Math.min(bucket.minLatencyMs, latency);
      bucket.maxLatencyMs =
        bucket.maxLatencyMs === null
          ? latency
          : Math.max(bucket.maxLatencyMs, latency);

      weightedLatencySum += latency;
      weightedConnectedCount += 1;
    }
  }

  let activeMinutes = 0;
  let breachedMinutes = 0;
  let minMinuteAvgMs: number | null = null;
  let maxMinuteAvgMs: number | null = null;
  let latestMinuteAvgMs: number | null = null;

  const buckets: LatencyMinuteBucket[] = accumulators.map((acc) => {
    const avgLatencyMs =
      acc.connectedCount > 0
        ? Math.round(acc.latencySum / acc.connectedCount)
        : null;
    const exceedsThreshold =
      avgLatencyMs !== null && avgLatencyMs > safeThreshold;

    if (avgLatencyMs !== null) {
      activeMinutes += 1;
      latestMinuteAvgMs = avgLatencyMs;
      minMinuteAvgMs =
        minMinuteAvgMs === null
          ? avgLatencyMs
          : Math.min(minMinuteAvgMs, avgLatencyMs);
      maxMinuteAvgMs =
        maxMinuteAvgMs === null
          ? avgLatencyMs
          : Math.max(maxMinuteAvgMs, avgLatencyMs);
      if (exceedsThreshold) {
        breachedMinutes += 1;
      }
    }

    return {
      minuteIndex: acc.minuteIndex,
      minuteStartIso: acc.minuteStartIso,
      minuteLabel: acc.minuteLabel,
      sampleCount: acc.sampleCount,
      connectedCount: acc.connectedCount,
      avgLatencyMs,
      minLatencyMs: acc.minLatencyMs,
      maxLatencyMs: acc.maxLatencyMs,
      exceedsThreshold,
      isCurrentMinute: acc.isCurrentMinute,
    };
  });

  const overallAvgMs =
    weightedConnectedCount > 0
      ? Math.round(weightedLatencySum / weightedConnectedCount)
      : null;

  return {
    generatedAt: now.toISOString(),
    thresholdMs: safeThreshold,
    summary: {
      windowMinutes: 60,
      overallAvgMs,
      minMinuteAvgMs,
      maxMinuteAvgMs,
      latestMinuteAvgMs,
      activeMinutes,
      totalSamples,
      breachedMinutes,
    },
    buckets,
  };
}

export type LatencyHistogramBand = 'nominal' | 'warning' | 'breach';

export interface LatencyHistogramBucket {
  id: string;
  label: string;
  minMs: number;
  maxMs: number | null;
  count: number;
  percentage: number;
  band: LatencyHistogramBand;
}

export interface LatencyHistogramSummary {
  windowMinutes: 60;
  totalConnectedSamples: number;
  disconnectedSamples: number;
  medianMs: number | null;
  p95Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
  dominantBucketLabel: string | null;
  dominantBucketSharePercent: number;
  withinThresholdPercent: number;
}

export interface LatencyHistogramSeries {
  generatedAt: string;
  thresholdMs: number;
  summary: LatencyHistogramSummary;
  buckets: LatencyHistogramBucket[];
}

export const LATENCY_HISTOGRAM_BUCKETS_SPEC: ReadonlyArray<{
  id: string;
  label: string;
  minMs: number;
  maxMs: number | null;
}> = [
  { id: '0-50', label: '0–50ms', minMs: 0, maxMs: 50 },
  { id: '51-100', label: '51–100ms', minMs: 51, maxMs: 100 },
  { id: '101-200', label: '101–200ms', minMs: 101, maxMs: 200 },
  { id: '201-350', label: '201–350ms', minMs: 201, maxMs: 350 },
  { id: '351-500', label: '351–500ms', minMs: 351, maxMs: 500 },
  { id: '501-1000', label: '501–1000ms', minMs: 501, maxMs: 1000 },
  { id: '1000+', label: '>1000ms', minMs: 1001, maxMs: null },
];

export function classifyHistogramBucketBand(
  minMs: number,
  maxMs: number | null,
  thresholdMs: number,
): LatencyHistogramBand {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  if (minMs > safeThreshold) {
    return 'breach';
  }
  if (maxMs === null || maxMs > safeThreshold) {
    return 'warning';
  }
  return 'nominal';
}

/**
 * Buckets connected response times over the trailing 60-minute window into
 * latency distribution bins for Recharts BarChart histogram visualization.
 */
export function buildHourlyLatencyHistogram(
  samples: readonly HealthCheckSample[],
  now: Date = new Date(),
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
): LatencyHistogramSeries {
  const safeThreshold = sanitizeLatencyThresholdMs(thresholdMs);
  const nowMs = now.getTime();
  const windowStartMs = nowMs - HOURLY_LATENCY_WINDOW_MINUTES * 60_000;

  const counts = LATENCY_HISTOGRAM_BUCKETS_SPEC.map(() => 0);
  const connectedLatencies: number[] = [];
  let disconnectedSamples = 0;

  for (const sample of samples) {
    const parsedMs = Date.parse(sample.checkedAt);
    if (
      Number.isNaN(parsedMs) ||
      parsedMs < windowStartMs ||
      parsedMs > nowMs + 60_000
    ) {
      continue;
    }

    if (
      sample.databaseStatus !== 'connected' ||
      sample.latencyMs === null ||
      !Number.isFinite(sample.latencyMs)
    ) {
      disconnectedSamples += 1;
      continue;
    }

    const latency = Math.max(0, Math.round(sample.latencyMs));
    connectedLatencies.push(latency);

    const bucketIndex = LATENCY_HISTOGRAM_BUCKETS_SPEC.findIndex(
      (spec) =>
        latency >= spec.minMs &&
        (spec.maxMs === null || latency <= spec.maxMs),
    );
    if (bucketIndex !== -1) {
      counts[bucketIndex] += 1;
    }
  }

  const totalConnectedSamples = connectedLatencies.length;
  let dominantBucketLabel: string | null = null;
  let dominantBucketCount = 0;
  let dominantBucketSharePercent = 0;

  const buckets: LatencyHistogramBucket[] = LATENCY_HISTOGRAM_BUCKETS_SPEC.map(
    (spec, idx) => {
      const count = counts[idx];
      const percentage =
        totalConnectedSamples > 0
          ? Number(((count / totalConnectedSamples) * 100).toFixed(1))
          : 0;
      if (count > dominantBucketCount) {
        dominantBucketCount = count;
        dominantBucketLabel = spec.label;
        dominantBucketSharePercent = percentage;
      }
      return {
        id: spec.id,
        label: spec.label,
        minMs: spec.minMs,
        maxMs: spec.maxMs,
        count,
        percentage,
        band: classifyHistogramBucketBand(spec.minMs, spec.maxMs, safeThreshold),
      };
    },
  );

  const withinCount = connectedLatencies.filter(
    (ms) => ms <= safeThreshold,
  ).length;
  const withinThresholdPercent =
    totalConnectedSamples > 0
      ? Number(((withinCount / totalConnectedSamples) * 100).toFixed(1))
      : 100;

  return {
    generatedAt: now.toISOString(),
    thresholdMs: safeThreshold,
    summary: {
      windowMinutes: 60,
      totalConnectedSamples,
      disconnectedSamples,
      medianMs: calculatePercentile(connectedLatencies, 50),
      p95Ms: calculatePercentile(connectedLatencies, 95),
      minMs:
        totalConnectedSamples > 0 ? Math.min(...connectedLatencies) : null,
      maxMs:
        totalConnectedSamples > 0 ? Math.max(...connectedLatencies) : null,
      dominantBucketLabel,
      dominantBucketSharePercent,
      withinThresholdPercent,
    },
    buckets,
  };
}





import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Radio,
  RefreshCw,
  Radar,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ANOMALY_SENSITIVITY_PRESETS,
  DEFAULT_ANOMALY_STD_MULTIPLIER,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  detectLatencyAnomalies,
  formatLatencyMs,
  isCriticalLatency,
  LATENCY_THRESHOLD_PRESETS_MS,
  type LatencyTrendPointWithAnomaly,
  type SystemHealthMetricsResponse,
} from '../../../backend/health/systemHealthTypes';
import { fetchSystemHealthMetricsApi } from '../../lib/apiClient';

export type PollIntervalSeconds = 0 | 5 | 15 | 30;

const POLL_OPTIONS: Array<{ value: PollIntervalSeconds; label: string }> = [
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 0, label: 'Paused' },
];

export interface DatabaseLatencyChartProps {
  /** Optional external alert threshold (syncs with parent controls when provided) */
  thresholdMs?: number;
  /** Optional Critical Latency threshold (ms) used to flag critical data points in vivid purple */
  criticalThresholdMs?: number;
  /** Callback invoked when the user clicks a threshold preset inside the widget */
  onThresholdChange?: (nextThresholdMs: number) => void;
  /** Controlled Live Mode state from parent (e.g., SystemHealthDashboard 5s interval) */
  externalLiveMode?: boolean;
  /** Controlled Anomaly Detection state from parent */
  anomalyDetectionEnabled?: boolean;
  /** Callback when Anomaly Detection mode is toggled */
  onAnomalyDetectionChange?: (enabled: boolean) => void;
  /** Controlled sensitivity sigma multiplier (1.5, 2, 2.5) */
  anomalySigma?: number;
  /** Callback when sensitivity sigma changes */
  onAnomalySigmaChange?: (sigma: number) => void;
  /** Callback invoked whenever fresh metrics are fetched (allows parent threshold toast evaluation) */
  onMetricsLoaded?: (metrics: SystemHealthMetricsResponse) => void;
  /** Maximum data points requested from /api/system-health/metrics (5..60) */
  limit?: number;
  /** Default real-time auto-poll interval in seconds (0 = paused) */
  defaultPollSeconds?: PollIntervalSeconds;
  /** Compact height mode suitable for overview panels */
  compact?: boolean;
  /** Show a tabular readout of the latest samples beneath the chart */
  showRecentTable?: boolean;
  /** Incrementing signal to trigger a fresh read when a parent runs a health probe */
  refreshSignal?: number;
  /** Optional navigation CTA shown in header (e.g., open full Latency view) */
  headerAction?: {
    label: string;
    onClick: () => void;
  };
}

interface CustomTooltipPayloadItem {
  payload?: LatencyTrendPointWithAnomaly;
}

function LatencyTooltip({
  active,
  payload,
  thresholdMs,
  criticalThresholdMs,
  anomalyDetectionEnabled,
  upperFenceMs,
}: {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  thresholdMs: number;
  criticalThresholdMs?: number;
  anomalyDetectionEnabled: boolean;
  upperFenceMs: number | null;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  const formattedClock = (() => {
    const parsed = new Date(point.checkedAt);
    if (Number.isNaN(parsed.getTime())) return point.timeLabel;
    return parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  })();

  const isDisconnected =
    point.databaseStatus !== 'connected' || point.latencyMs === null;
  const isCriticalPoint =
    !isDisconnected &&
    criticalThresholdMs !== undefined &&
    isCriticalLatency(point.latencyMs, criticalThresholdMs);
  const isStatisticalSpike = anomalyDetectionEnabled && point.isAnomaly;

  return (
    <div className="border border-[#FDFCF9]/15 bg-[#0E1113] px-3.5 py-3 text-xs text-[#FDFCF9] shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-[#FDFCF9]/12 pb-1.5">
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#FDFCF9]/80">
          Probe #{point.index} · {formattedClock}
        </span>
        <span
          className={`font-mono text-[10px] font-bold uppercase ${
            isDisconnected
              ? 'text-[#F87171]'
              : isCriticalPoint
                ? 'text-[#C084FC]'
                : isStatisticalSpike
                  ? 'text-[#F87171]'
                  : point.exceedsThreshold
                    ? 'text-[#F59E0B]'
                    : 'text-[#4ADE80]'
          }`}
        >
          {isDisconnected
            ? 'Disconnected'
            : isCriticalPoint
              ? 'Critical Latency'
              : isStatisticalSpike
                ? 'Anomaly Spike'
                : point.exceedsThreshold
                  ? 'Above Threshold'
                  : 'Nominal'}
        </span>
      </div>
      <div className="mt-2 space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">Round-trip</span>
          <span
            className={`font-bold ${
              isCriticalPoint
                ? 'text-[#C084FC]'
                : isStatisticalSpike
                  ? 'text-[#F87171]'
                  : 'text-[#FDFCF9]'
            }`}
          >
            {formatLatencyMs(point.latencyMs)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">3-probe avg</span>
          <span className="text-[#E5C169]">
            {formatLatencyMs(point.rollingAvgMs)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">Alert limit</span>
          <span className="text-[#FDFCF9]/80">{thresholdMs} ms</span>
        </div>
        {criticalThresholdMs !== undefined && (
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Critical limit</span>
            <span
              className={
                isCriticalPoint
                  ? 'font-bold text-[#C084FC]'
                  : 'text-[#FDFCF9]/80'
              }
            >
              {criticalThresholdMs} ms
            </span>
          </div>
        )}
        {anomalyDetectionEnabled && point.zScore !== null && (
          <div className="flex items-center justify-between gap-5 border-t border-[#FDFCF9]/10 pt-1">
            <span className="text-[#FDFCF9]/65">Z-Score</span>
            <span
              className={
                isStatisticalSpike
                  ? 'font-bold text-[#F87171]'
                  : 'text-[#FDFCF9]/80'
              }
            >
              {point.zScore >= 0 ? `+${point.zScore}` : point.zScore}σ
              {upperFenceMs !== null ? ` (>${upperFenceMs}ms)` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DatabaseLatencyChart({
  thresholdMs: controlledThresholdMs,
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  onThresholdChange,
  externalLiveMode,
  anomalyDetectionEnabled: controlledAnomalyEnabled,
  onAnomalyDetectionChange,
  anomalySigma: controlledSigma,
  onAnomalySigmaChange,
  onMetricsLoaded,
  limit = 30,
  defaultPollSeconds = 15,
  compact = false,
  showRecentTable = false,
  refreshSignal = 0,
  headerAction,
}: DatabaseLatencyChartProps) {
  const gradientId = useId();
  const [internalThresholdMs, setInternalThresholdMs] = useState<number>(
    controlledThresholdMs ?? DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  );
  const activeThresholdMs = controlledThresholdMs ?? internalThresholdMs;

  const [internalAnomalyEnabled, setInternalAnomalyEnabled] =
    useState<boolean>(false);
  const anomalyEnabled = controlledAnomalyEnabled ?? internalAnomalyEnabled;

  const [internalSigma, setInternalSigma] = useState<number>(
    DEFAULT_ANOMALY_STD_MULTIPLIER,
  );
  const activeSigma = controlledSigma ?? internalSigma;

  const [pollSeconds, setPollSeconds] =
    useState<PollIntervalSeconds>(defaultPollSeconds);
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(true);
  const [scaleToThreshold, setScaleToThreshold] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<SystemHealthMetricsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSampling, setIsSampling] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleAnomaly = () => {
    const next = !anomalyEnabled;
    if (onAnomalyDetectionChange) {
      onAnomalyDetectionChange(next);
    } else {
      setInternalAnomalyEnabled(next);
    }
  };

  const handleSelectSigma = (nextSigma: number) => {
    if (onAnomalySigmaChange) {
      onAnomalySigmaChange(nextSigma);
    } else {
      setInternalSigma(nextSigma);
    }
  };

  const loadMetrics = useCallback(
    async (options?: { probe?: boolean; showSpinner?: boolean }) => {
      const shouldProbe = options?.probe ?? true;
      if (options?.showSpinner) {
        setIsSampling(true);
      }
      setErrorMessage(null);

      try {
        const data = await fetchSystemHealthMetricsApi({
          limit,
          thresholdMs: activeThresholdMs,
          probe: shouldProbe,
        });
        setMetrics(data);
        onMetricsLoaded?.(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to reach /api/system-health/metrics.',
        );
      } finally {
        setIsLoading(false);
        setIsSampling(false);
      }
    },
    [activeThresholdMs, limit, onMetricsLoaded],
  );

  // Initial load & threshold changes
  useEffect(() => {
    void loadMetrics({ probe: metrics === null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThresholdMs, limit]);

  // Sync when parent signals a completed health probe (e.g., Live Mode 5s tick or Run Live Check)
  useEffect(() => {
    if (refreshSignal > 0) {
      void loadMetrics({ probe: false });
    }
  }, [refreshSignal, loadMetrics]);

  // Internal auto-poll interval (skipped when parent externalLiveMode is driving the 5s refresh loop)
  useEffect(() => {
    if (externalLiveMode) return;
    if (pollSeconds <= 0) return;
    const timer = window.setInterval(() => {
      void loadMetrics({ probe: true });
    }, pollSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [pollSeconds, externalLiveMode, loadMetrics]);

  const handleSelectThreshold = (nextMs: number) => {
    if (onThresholdChange) {
      onThresholdChange(nextMs);
    } else {
      setInternalThresholdMs(nextMs);
    }
  };

  const rawSeries = metrics?.series ?? [];
  const { stats: anomalyStats, points: annotatedSeries } = useMemo(
    () => detectLatencyAnomalies(rawSeries, activeSigma),
    [rawSeries, activeSigma],
  );

  const criticalPointCount = useMemo(
    () =>
      annotatedSeries.filter(
        (pt) =>
          pt.databaseStatus === 'connected' &&
          isCriticalLatency(pt.latencyMs, criticalThresholdMs),
      ).length,
    [annotatedSeries, criticalThresholdMs],
  );

  const summary = metrics?.summary;
  const isAlertActive = Boolean(metrics?.alert.isAlertActive);
  const isDisconnected = metrics?.databaseStatus === 'disconnected';

  const yDomainMax = useMemo(() => {
    const observedMax = annotatedSeries.reduce((maxVal, pt) => {
      const candidate = Math.max(pt.latencyMs ?? 0, pt.rollingAvgMs ?? 0);
      return Math.max(maxVal, candidate);
    }, 0);

    let baseCeiling = scaleToThreshold
      ? Math.max(observedMax, activeThresholdMs, criticalThresholdMs)
      : observedMax > activeThresholdMs * 0.7
        ? Math.max(observedMax, activeThresholdMs)
        : Math.max(observedMax, 60);

    if (observedMax > criticalThresholdMs * 0.7) {
      baseCeiling = Math.max(baseCeiling, criticalThresholdMs);
    }

    if (anomalyEnabled && anomalyStats.upperFenceMs !== null) {
      baseCeiling = Math.max(baseCeiling, anomalyStats.upperFenceMs);
    }

    const padded = baseCeiling * 1.2;
    const step = padded > 250 ? 50 : 25;
    return Math.max(50, Math.ceil(padded / step) * step);
  }, [
    annotatedSeries,
    activeThresholdMs,
    criticalThresholdMs,
    scaleToThreshold,
    anomalyEnabled,
    anomalyStats.upperFenceMs,
  ]);

  const recentSamplesReversed = useMemo(
    () => [...annotatedSeries].reverse().slice(0, 10),
    [annotatedSeries],
  );

  return (
    <section
      aria-label="Database latency trends"
      data-testid="database-latency-chart"
      className="border border-[#0E1113]/15 bg-[#FDFCF9]"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0E1113]/10 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-[#0E1113]" />
            <h2 className="text-sm font-semibold text-[#0E1113] sm:text-base">
              Cloud SQL Latency Trends
            </h2>
            {metrics && (
              <span
                className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  isDisconnected
                    ? 'border-[#C8232C]/35 bg-[#C8232C]/10 text-[#C8232C]'
                    : isAlertActive
                      ? 'border-[#D97706]/35 bg-[#D97706]/10 text-[#B45309]'
                      : 'border-[#16A34A]/30 bg-[#16A34A]/10 text-[#15803D]'
                }`}
              >
                {isDisconnected || isAlertActive ? (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                )}
                <span>{metrics.alert.badgeLabel}</span>
              </span>
            )}
            {criticalPointCount > 0 && (
              <span
                data-testid="chart-critical-latency-badge"
                className="inline-flex items-center gap-1 border border-[#9333EA]/40 bg-[#FAF5FF] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#7E22CE] tabular-nums"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>
                  {criticalPointCount} Critical (&gt;{criticalThresholdMs}ms)
                </span>
              </span>
            )}
            {externalLiveMode && (
              <span
                data-testid="chart-live-mode-indicator"
                className="inline-flex items-center gap-1 border border-[#16A34A]/35 bg-[#F0FDF4] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#15803D]"
              >
                <Radio className="h-3 w-3 shrink-0" />
                <span>Live · 5s</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#5A5D57]">
            Live round-trip query telemetry from{' '}
            <code className="font-mono text-[11px] text-[#0E1113]">
              /api/system-health/metrics
            </code>
            {metrics ? (
              <span className="font-mono tabular-nums">
                {' '}
                · Pool {metrics.pool.total}/{metrics.pool.idle} idle
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Anomaly Detection Toggle */}
          <button
            type="button"
            onClick={handleToggleAnomaly}
            aria-pressed={anomalyEnabled}
            data-testid="anomaly-detection-toggle"
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              anomalyEnabled
                ? 'border-[#DC2626] bg-[#DC2626] text-[#FDFCF9]'
                : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
            }`}
          >
            <Radar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {anomalyEnabled ? 'Anomaly Detection: On' : 'Anomaly Detection'}
            </span>
          </button>

          {/* Real-time Poll Interval Selector (hidden when controlled by parent Live Mode) */}
          {!externalLiveMode && (
            <div
              role="group"
              aria-label="Live refresh interval"
              className="inline-flex border border-[#0E1113]/15 bg-[#F4F2EC] p-0.5"
            >
              {POLL_OPTIONS.map((opt) => {
                const active = pollSeconds === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPollSeconds(opt.value)}
                    className={`px-2.5 py-1 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0E1113] text-[#FDFCF9]'
                        : 'text-[#0E1113]/70 hover:text-[#0E1113]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadMetrics({ probe: true, showSpinner: true })}
            disabled={isSampling}
            className="inline-flex items-center gap-1.5 bg-[#0E1113] px-3.5 py-1.5 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSampling ? 'animate-spin' : ''}`}
            />
            Sample Now
          </button>

          {headerAction && (
            <button
              type="button"
              onClick={headerAction.onClick}
              className="border border-[#0E1113]/20 bg-[#FDFCF9] px-3 py-1.5 text-xs font-semibold text-[#0E1113] transition hover:border-[#0E1113] cursor-pointer whitespace-nowrap shrink-0"
            >
              {headerAction.label}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/10 sm:grid-cols-5 sm:divide-y-0">
        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-medium text-[#5A5D57]">Current</p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              isDisconnected
                ? 'text-[#C8232C]'
                : isAlertActive
                  ? 'text-[#B45309]'
                  : 'text-[#0E1113]'
            }`}
          >
            {summary ? formatLatencyMs(summary.currentMs) : '—'}
          </p>
        </div>

        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-medium text-[#5A5D57]">Average</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary ? formatLatencyMs(summary.averageMs) : '—'}
          </p>
        </div>

        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-medium text-[#5A5D57]">P95</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary ? formatLatencyMs(summary.p95Ms) : '—'}
          </p>
        </div>

        <div className="px-4 py-3.5 sm:px-5">
          <p className="text-[11px] font-medium text-[#5A5D57]">Peak</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary ? formatLatencyMs(summary.maxMs) : '—'}
          </p>
        </div>

        <div className="col-span-2 px-4 py-3.5 sm:col-span-1 sm:px-5">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            {anomalyEnabled
              ? `Anomalies (>${anomalyStats.upperFenceMs ?? '—'}ms)`
              : `Breaches (>${activeThresholdMs}ms)`}
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              anomalyEnabled
                ? anomalyStats.anomalyCount > 0
                  ? 'text-[#DC2626]'
                  : 'text-[#15803D]'
                : (summary?.thresholdBreaches ?? 0) > 0
                  ? 'text-[#C8232C]'
                  : 'text-[#15803D]'
            }`}
          >
            {anomalyEnabled
              ? anomalyStats.hasEnoughSamples
                ? anomalyStats.anomalyCount
                : '—'
              : summary
                ? summary.thresholdBreaches
                : '—'}
          </p>
        </div>
      </div>

      {/* Statistical Anomaly Detection Status Bar (when enabled) */}
      {anomalyEnabled && (
        <div
          data-testid="anomaly-stats-bar"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DC2626]/20 bg-[#FEF2F2]/75 px-5 py-2.5 sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-[#7F1D1D]">
            <span className="font-bold uppercase tracking-[0.08em] text-[#DC2626]">
              Std-Dev Heuristic (μ + {activeSigma}σ)
            </span>
            {anomalyStats.hasEnoughSamples ? (
              <>
                <span>Mean: {formatLatencyMs(anomalyStats.meanMs)}</span>
                <span>σ: {anomalyStats.stdDevMs} ms</span>
                <span>
                  Spike Cutoff:{' '}
                  <strong>&gt;{anomalyStats.upperFenceMs} ms</strong>
                </span>
                <span>
                  Detected:{' '}
                  <strong
                    className={
                      anomalyStats.anomalyCount > 0
                        ? 'text-[#DC2626]'
                        : 'text-[#15803D]'
                    }
                  >
                    {anomalyStats.anomalyCount}{' '}
                    {anomalyStats.anomalyCount === 1 ? 'spike' : 'spikes'}
                  </strong>
                </span>
              </>
            ) : (
              <span>
                Need at least 3 connected samples to calculate standard
                deviation ({anomalyStats.sampleCount}/3).
              </span>
            )}
          </div>

          <div
            role="group"
            aria-label="Anomaly sensitivity"
            className="flex items-center gap-1"
          >
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#7F1D1D]">
              Sensitivity:
            </span>
            {ANOMALY_SENSITIVITY_PRESETS.map((sigma) => {
              const active = activeSigma === sigma;
              return (
                <button
                  key={sigma}
                  type="button"
                  onClick={() => handleSelectSigma(sigma)}
                  aria-pressed={active}
                  className={`border px-2 py-0.5 font-mono text-[11px] tabular-nums transition cursor-pointer ${
                    active
                      ? 'border-[#DC2626] bg-[#DC2626] font-semibold text-[#FDFCF9]'
                      : 'border-[#DC2626]/25 bg-[#FDFCF9] text-[#7F1D1D] hover:border-[#DC2626]'
                  }`}
                >
                  {sigma}σ
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0E1113]/10 bg-[#F4F2EC]/55 px-5 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-medium text-[#5A5D57]">
            Alert Threshold:
          </span>
          {LATENCY_THRESHOLD_PRESETS_MS.map((preset) => {
            const active = activeThresholdMs === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectThreshold(preset)}
                className={`border px-2 py-0.5 font-mono text-[11px] tabular-nums transition cursor-pointer ${
                  active
                    ? 'border-[#C8232C] bg-[#C8232C] font-semibold text-[#FDFCF9]'
                    : 'border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75 hover:border-[#0E1113]'
                }`}
              >
                {preset}ms
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A5D57]">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showMovingAvg}
              onChange={(e) => setShowMovingAvg(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
            <span>3-Probe Moving Avg</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={scaleToThreshold}
              onChange={(e) => setScaleToThreshold(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#0E1113]"
            />
            <span>Show Threshold Line in Scale</span>
          </label>
        </div>
      </div>

      {/* Main Recharts Canvas */}
      <div className="px-3 py-5 sm:px-6">
        {isLoading ? (
          <div
            className="flex items-center justify-center bg-[#F4F2EC]/60"
            style={{ height: compact ? 240 : 300 }}
          >
            <div className="flex items-center gap-2 font-mono text-xs text-[#5A5D57]">
              <Activity className="h-4 w-4 animate-pulse text-[#0E1113]" />
              <span>Sampling Cloud SQL latency metrics…</span>
            </div>
          </div>
        ) : errorMessage ? (
          <div
            className="flex flex-col items-center justify-center border border-[#C8232C]/25 bg-[#C8232C]/5 px-6 text-center"
            style={{ height: compact ? 240 : 300 }}
          >
            <AlertTriangle className="h-5 w-5 text-[#C8232C]" />
            <p className="mt-2 text-sm font-semibold text-[#0E1113]">
              Could not fetch latency metrics
            </p>
            <p className="mt-1 max-w-md text-xs text-[#5A5D57]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadMetrics({ probe: true, showSpinner: true })}
              className="mt-4 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
            >
              Retry Metrics Fetch
            </button>
          </div>
        ) : annotatedSeries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center border border-dashed border-[#0E1113]/20 bg-[#F4F2EC]/40 px-6 text-center"
            style={{ height: compact ? 240 : 300 }}
          >
            <Database className="h-5 w-5 text-[#5A5D57]" />
            <p className="mt-2 text-sm font-semibold text-[#0E1113]">
              No database probes recorded yet
            </p>
            <p className="mt-1 text-xs text-[#5A5D57]">
              Trigger a live Cloud SQL sample to start plotting latency trends.
            </p>
            <button
              type="button"
              onClick={() => void loadMetrics({ probe: true, showSpinner: true })}
              className="mt-4 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
            >
              Run First Probe
            </button>
          </div>
        ) : (
          <div>
            <div style={{ width: '100%', height: compact ? 240 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={annotatedSeries}
                  margin={{ top: 14, right: 28, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#0E1113"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#0E1113"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="rgba(14, 17, 19, 0.08)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="timeLabel"
                    tick={{
                      fill: '#5A5D57',
                      fontSize: 11,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(14, 17, 19, 0.14)' }}
                    minTickGap={28}
                  />

                  <YAxis
                    domain={[0, yDomainMax]}
                    tickFormatter={(val: number) => `${val}ms`}
                    tick={{
                      fill: '#5A5D57',
                      fontSize: 11,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />

                  <Tooltip
                    content={
                      <LatencyTooltip
                        thresholdMs={activeThresholdMs}
                        criticalThresholdMs={criticalThresholdMs}
                        anomalyDetectionEnabled={anomalyEnabled}
                        upperFenceMs={anomalyStats.upperFenceMs}
                      />
                    }
                    cursor={{
                      stroke: 'rgba(14, 17, 19, 0.25)',
                      strokeDasharray: '3 3',
                    }}
                  />

                  {activeThresholdMs <= yDomainMax && (
                    <ReferenceLine
                      y={activeThresholdMs}
                      stroke="#B45309"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Alert ${activeThresholdMs}ms`,
                        position: 'insideTopRight',
                        fill: '#B45309',
                        fontSize: 11,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    />
                  )}

                  {criticalThresholdMs <= yDomainMax && (
                    <ReferenceLine
                      y={criticalThresholdMs}
                      stroke="#9333EA"
                      strokeDasharray="4 3"
                      strokeWidth={1.75}
                      label={{
                        value: `Critical ${criticalThresholdMs}ms`,
                        position: 'insideTopLeft',
                        fill: '#7E22CE',
                        fontSize: 11,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    />
                  )}

                  {anomalyEnabled &&
                    anomalyStats.hasEnoughSamples &&
                    anomalyStats.upperFenceMs !== null &&
                    anomalyStats.stdDevMs !== null &&
                    anomalyStats.stdDevMs > 0 &&
                    anomalyStats.upperFenceMs <= yDomainMax && (
                      <ReferenceLine
                        y={anomalyStats.upperFenceMs}
                        stroke="#DC2626"
                        strokeDasharray="3 3"
                        strokeWidth={1.75}
                        label={{
                          value: `Spike >${anomalyStats.upperFenceMs}ms (μ+${activeSigma}σ)`,
                          position: 'insideBottomRight',
                          fill: '#DC2626',
                          fontSize: 11,
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      />
                    )}

                  <Area
                    type="monotone"
                    dataKey="latencyMs"
                    name="Latency (ms)"
                    stroke="#0E1113"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    connectNulls={false}
                    isAnimationActive={false}
                    dot={(dotProps: {
                      cx?: number;
                      cy?: number;
                      payload?: LatencyTrendPointWithAnomaly;
                      index?: number;
                    }) => {
                      const { cx, cy, payload, index } = dotProps;
                      if (
                        typeof cx !== 'number' ||
                        typeof cy !== 'number' ||
                        !payload ||
                        payload.latencyMs === null
                      ) {
                        return <g key={`empty-${index ?? 0}`} />;
                      }

                      const isCriticalPoint =
                        payload.databaseStatus === 'connected' &&
                        isCriticalLatency(payload.latencyMs, criticalThresholdMs);

                      if (isCriticalPoint) {
                        return (
                          <g
                            key={`critical-dot-${payload.index}`}
                            data-testid="recharts-critical-latency-point"
                          >
                            <circle
                              cx={cx}
                              cy={cy}
                              r={9}
                              fill="rgba(147, 51, 234, 0.22)"
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill="#9333EA"
                              stroke="#FDFCF9"
                              strokeWidth={2}
                            />
                          </g>
                        );
                      }

                      if (anomalyEnabled && payload.isAnomaly) {
                        return (
                          <g
                            key={`anomaly-dot-${payload.index}`}
                            data-testid="recharts-anomaly-spike"
                          >
                            <circle
                              cx={cx}
                              cy={cy}
                              r={9}
                              fill="rgba(220, 38, 38, 0.22)"
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill="#DC2626"
                              stroke="#FDFCF9"
                              strokeWidth={2}
                            />
                          </g>
                        );
                      }

                      const fill = payload.exceedsThreshold
                        ? '#B45309'
                        : '#0E1113';
                      return (
                        <circle
                          key={`dot-${payload.index}`}
                          cx={cx}
                          cy={cy}
                          r={payload.exceedsThreshold ? 4.5 : 3}
                          fill={fill}
                          stroke="#FDFCF9"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{
                      r: 5,
                      fill: '#9333EA',
                      stroke: '#FDFCF9',
                      strokeWidth: 2,
                    }}
                  />

                  {showMovingAvg && (
                    <Line
                      type="monotone"
                      dataKey="rollingAvgMs"
                      name="3-Probe Avg"
                      stroke="#B8933B"
                      strokeWidth={1.75}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Sample Counter Footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#0E1113]/10 pt-3 text-xs text-[#5A5D57]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-4 bg-[#0E1113]"
                    aria-hidden="true"
                  />
                  <span>Probe Latency (ms)</span>
                </span>
                {showMovingAvg && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#B8933B]"
                      aria-hidden="true"
                    />
                    <span>3-Probe Moving Avg</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#B45309]"
                    aria-hidden="true"
                  />
                  <span>Alert Limit ({activeThresholdMs}ms)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#7E22CE]">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full bg-[#9333EA]"
                    aria-hidden="true"
                  />
                  <span>Critical (&gt;{criticalThresholdMs}ms)</span>
                </span>
                {anomalyEnabled && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#DC2626]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full bg-[#DC2626]"
                      aria-hidden="true"
                    />
                    <span>Anomaly Spike (&gt;μ+{activeSigma}σ)</span>
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] tabular-nums text-[#5A5D57]">
                {annotatedSeries.length} sample
                {annotatedSeries.length === 1 ? '' : 's'} · Availability{' '}
                {summary?.availabilityPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Optional Detailed Recent Samples Table */}
      {showRecentTable && recentSamplesReversed.length > 0 && (
        <div className="border-t border-[#0E1113]/10">
          <div className="border-b border-[#0E1113]/10 bg-[#F4F2EC]/50 px-5 py-3 sm:px-6">
            <h3 className="text-xs font-semibold text-[#0E1113]">
              Latest Probe Samples ({recentSamplesReversed.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#0E1113]/10 text-[#5A5D57]">
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">
                    Probe
                  </th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">
                    Connection
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium whitespace-nowrap">
                    Latency
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium whitespace-nowrap">
                    3-Probe Avg
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E1113]/8 font-mono tabular-nums">
                {recentSamplesReversed.map((pt) => (
                  <tr
                    key={`${pt.index}-${pt.checkedAt}`}
                    className={
                      anomalyEnabled && pt.isAnomaly
                        ? 'bg-[#FEF2F2]/70 hover:bg-[#FEF2F2]'
                        : 'hover:bg-[#F4F2EC]/50'
                    }
                  >
                    <td className="px-5 py-2.5 text-[#5A5D57]">#{pt.index}</td>
                    <td className="px-5 py-2.5 text-[#0E1113] whitespace-nowrap">
                      {pt.timeLabel}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <span
                        className={
                          pt.databaseStatus === 'connected'
                            ? 'font-semibold text-[#15803D]'
                            : 'font-semibold text-[#C8232C]'
                        }
                      >
                        {pt.databaseStatus === 'connected'
                          ? 'Connected'
                          : 'Disconnected'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-[#0E1113] whitespace-nowrap">
                      {formatLatencyMs(pt.latencyMs)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-[#5A5D57] whitespace-nowrap">
                      {formatLatencyMs(pt.rollingAvgMs)}
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <span
                        className={
                          pt.databaseStatus !== 'connected'
                            ? 'font-semibold text-[#C8232C]'
                            : anomalyEnabled && pt.isAnomaly
                              ? 'font-semibold text-[#DC2626]'
                              : pt.exceedsThreshold
                                ? 'font-semibold text-[#B45309]'
                                : 'text-[#15803D]'
                        }
                      >
                        {pt.databaseStatus !== 'connected'
                          ? 'Unreachable'
                          : anomalyEnabled && pt.isAnomaly
                            ? `Anomaly (+${pt.zScore}σ)`
                            : pt.exceedsThreshold
                              ? `>${activeThresholdMs}ms`
                              : 'Nominal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

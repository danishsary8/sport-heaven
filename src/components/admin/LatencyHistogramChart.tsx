import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildHourlyLatencyHistogram,
  classifyHistogramBucketBand,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  formatLatencyMs,
  type HealthCheckSample,
  type LatencyHistogramBand,
  type LatencyHistogramBucket,
  type LatencyHistogramSeries,
} from '../../../backend/health/systemHealthTypes';

export interface LatencyHistogramChartProps {
  /** Pre-aggregated 1-hour latency distribution buckets from GET /api/system-health */
  histogram?: LatencyHistogramSeries;
  /** Optional raw probes fallback if histogram is omitted */
  fallbackSamples?: readonly HealthCheckSample[];
  /** Active admin alert threshold (ms) used to color-code breach buckets */
  thresholdMs?: number;
  /** Active admin Critical Latency threshold (ms) used to flag critical buckets in purple */
  criticalThresholdMs?: number;
  /** Syncs with parent Live Mode (5s polling badge) */
  liveMode?: boolean;
  /** ISO timestamp of latest telemetry sync */
  lastUpdatedAt?: string;
}

type HistogramMetricMode = 'count' | 'percentage';

interface HistogramTooltipPayloadItem {
  payload?: LatencyHistogramBucket;
}

function isCriticalHistogramBucket(
  bucket: LatencyHistogramBucket,
  criticalThresholdMs: number,
): boolean {
  return bucket.minMs > criticalThresholdMs;
}

function getBandFill(
  band: LatencyHistogramBand,
  isCritical: boolean,
): string {
  if (isCritical) return '#9333EA';
  switch (band) {
    case 'breach':
      return '#DC2626';
    case 'warning':
      return '#D97706';
    default:
      return '#0E1113';
  }
}

function getBandMeta(
  band: LatencyHistogramBand,
  isCritical: boolean,
): {
  label: string;
  textClass: string;
} {
  if (isCritical) {
    return { label: 'Critical Latency', textClass: 'text-[#C084FC]' };
  }
  switch (band) {
    case 'breach':
      return { label: 'Exceeds Limit', textClass: 'text-[#F87171]' };
    case 'warning':
      return { label: 'Straddles Limit', textClass: 'text-[#FBBF24]' };
    default:
      return { label: 'Within Limit', textClass: 'text-[#4ADE80]' };
  }
}

function HistogramTooltip({
  active,
  payload,
  thresholdMs,
  criticalThresholdMs,
  totalConnected,
}: {
  active?: boolean;
  payload?: HistogramTooltipPayloadItem[];
  thresholdMs: number;
  criticalThresholdMs: number;
  totalConnected: number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  const isCritical = isCriticalHistogramBucket(bucket, criticalThresholdMs);
  const bandMeta = getBandMeta(bucket.band, isCritical);

  return (
    <div className="border border-[#FDFCF9]/15 bg-[#0E1113] px-3.5 py-3 text-xs text-[#FDFCF9] shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-[#FDFCF9]/12 pb-1.5">
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#FDFCF9]/90">
          Bucket {bucket.label}
        </span>
        <span
          className={`font-mono text-[10px] font-bold uppercase ${bandMeta.textClass}`}
        >
          {bandMeta.label}
        </span>
      </div>

      <div className="mt-2 space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">Probe Count</span>
          <span className="font-bold text-[#FDFCF9]">
            {bucket.count} / {totalConnected}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">Distribution Share</span>
          <span className="text-[#E5C169]">{bucket.percentage.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-5 border-t border-[#FDFCF9]/10 pt-1">
          <span className="text-[#FDFCF9]/65">Alert Threshold</span>
          <span className="text-[#FDFCF9]/75">{thresholdMs} ms</span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[#FDFCF9]/65">Critical Limit</span>
          <span
            className={
              isCritical ? 'font-bold text-[#C084FC]' : 'text-[#FDFCF9]/75'
            }
          >
            {criticalThresholdMs} ms
          </span>
        </div>
      </div>
    </div>
  );
}

export function LatencyHistogramChart({
  histogram,
  fallbackSamples = [],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  liveMode = false,
  lastUpdatedAt,
}: LatencyHistogramChartProps) {
  const [metricMode, setMetricMode] = useState<HistogramMetricMode>('count');

  const resolvedHistogram = useMemo<LatencyHistogramSeries>(() => {
    const base =
      histogram && histogram.buckets.length > 0
        ? histogram
        : buildHourlyLatencyHistogram(fallbackSamples, new Date(), thresholdMs);

    // Dynamically re-classify bucket color bands against the admin's active thresholdMs
    const buckets = base.buckets.map((bucket) => ({
      ...bucket,
      band: classifyHistogramBucketBand(bucket.minMs, bucket.maxMs, thresholdMs),
    }));

    // Recompute approximate within-threshold share if threshold changed client-side
    const strictlyWithinSamples = buckets
      .filter((b) => b.band === 'nominal')
      .reduce((acc, b) => acc + b.count, 0);
    const totalConnected = base.summary.totalConnectedSamples;
    const withinThresholdPercent =
      thresholdMs === base.thresholdMs
        ? base.summary.withinThresholdPercent
        : totalConnected > 0
          ? Number(((strictlyWithinSamples / totalConnected) * 100).toFixed(1))
          : 100;

    return {
      ...base,
      thresholdMs,
      summary: {
        ...base.summary,
        withinThresholdPercent,
      },
      buckets,
    };
  }, [histogram, fallbackSamples, thresholdMs]);

  const { summary, buckets } = resolvedHistogram;
  const maxBarCount = Math.max(1, ...buckets.map((b) => b.count));
  const yDomain: [number, number] =
    metricMode === 'percentage'
      ? [0, 100]
      : [0, Math.max(4, Math.ceil(maxBarCount * 1.25))];

  const hasBreachSamples = buckets.some(
    (b) => b.band === 'breach' && b.count > 0,
  );

  const formattedClock = (() => {
    const iso = lastUpdatedAt ?? resolvedHistogram.generatedAt;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
  })();

  return (
    <section
      aria-label="System response time distribution histogram over the last hour"
      data-testid="latency-histogram-chart"
      className="border border-[#0E1113]/15 bg-[#FDFCF9]"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#0E1113]/12 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <BarChart2 className="h-4 w-4 text-[#0E1113]" />
            <h2 className="text-base font-semibold text-[#0E1113]">
              Response Time Distribution (Last Hour)
            </h2>
            <span
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                hasBreachSamples
                  ? 'border-[#DC2626]/35 bg-[#FEF2F2] text-[#DC2626]'
                  : 'border-[#16A34A]/30 bg-[#16A34A]/8 text-[#15803D]'
              }`}
            >
              {hasBreachSamples ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              <span>
                {summary.withinThresholdPercent.toFixed(1)}% ≤ {thresholdMs}ms
              </span>
            </span>
            {liveMode && (
              <span
                data-testid="histogram-live-mode-indicator"
                className="inline-flex items-center gap-1 border border-[#16A34A]/35 bg-[#16A34A]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#15803D]"
              >
                <Radio className="h-3 w-3 animate-pulse" />
                <span>Live · 5s</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#5A5D57]">
            Latency histogram across 7 response-time buckets over the last 60 minutes ·{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {summary.totalConnectedSamples} connected probe
              {summary.totalConnectedSamples === 1 ? '' : 's'}
            </span>
            {summary.disconnectedSamples > 0 && (
              <>
                {' '}
                ·{' '}
                <span className="font-mono tabular-nums text-[#DC2626]">
                  {summary.disconnectedSamples} failed
                </span>
              </>
            )}{' '}
            · Updated{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {formattedClock} UTC
            </span>
          </p>
        </div>

        {/* Metric Mode Switcher */}
        <div
          role="group"
          aria-label="Histogram Y-axis metric"
          className="inline-flex self-start border border-[#0E1113]/20 bg-[#F4F2EC] lg:self-auto"
        >
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            aria-pressed={metricMode === 'count'}
            data-testid="histogram-metric-count"
            className={`px-3 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
              metricMode === 'count'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
            }`}
          >
            Probe Count
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('percentage')}
            aria-pressed={metricMode === 'percentage'}
            data-testid="histogram-metric-percent"
            className={`px-3 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
              metricMode === 'percentage'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
            }`}
          >
            Share (%)
          </button>
        </div>
      </div>

      {/* 4-Column Distribution KPI Strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/12 sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Dominant Bucket
          </p>
          <p
            data-testid="histogram-dominant-bucket"
            className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]"
          >
            {summary.dominantBucketLabel ?? '—'}
            {summary.dominantBucketLabel && (
              <span className="ml-1.5 text-xs font-medium text-[#5A5D57]">
                ({summary.dominantBucketSharePercent.toFixed(0)}%)
              </span>
            )}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Median (P50)
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {formatLatencyMs(summary.medianMs)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            95th Percentile (P95)
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              summary.p95Ms !== null && summary.p95Ms > thresholdMs
                ? 'text-[#DC2626]'
                : 'text-[#0E1113]'
            }`}
          >
            {formatLatencyMs(summary.p95Ms)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Observed Range
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary.minMs !== null && summary.maxMs !== null
              ? `${summary.minMs}–${summary.maxMs} ms`
              : '—'}
          </p>
        </div>
      </div>

      {/* Recharts BarChart Histogram Canvas */}
      <div className="px-4 pt-5 pb-3 sm:px-5">
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buckets}
              barCategoryGap="10%"
              margin={{ top: 20, right: 20, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                stroke="rgba(14,17,19,0.08)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: '#5A5D57',
                  fontSize: 11,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(14,17,19,0.16)' }}
                interval={0}
              />

              <YAxis
                domain={yDomain}
                allowDecimals={false}
                tickFormatter={(value: number) =>
                  metricMode === 'percentage' ? `${value}%` : String(value)
                }
                tick={{
                  fill: '#5A5D57',
                  fontSize: 11,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                tickLine={false}
                axisLine={false}
                width={46}
              />

              <Tooltip
                cursor={{ fill: 'rgba(14,17,19,0.05)' }}
                content={
                  <HistogramTooltip
                    thresholdMs={thresholdMs}
                    criticalThresholdMs={criticalThresholdMs}
                    totalConnected={summary.totalConnectedSamples}
                  />
                }
              />

              <Bar
                dataKey={metricMode}
                name={metricMode === 'percentage' ? 'Share (%)' : 'Probe Count'}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              >
                {buckets.map((bucket) => {
                  const isCritical = isCriticalHistogramBucket(
                    bucket,
                    criticalThresholdMs,
                  );
                  return (
                    <Cell
                      key={bucket.id}
                      fill={getBandFill(bucket.band, isCritical)}
                      fillOpacity={bucket.count > 0 ? 0.92 : 0.12}
                    />
                  );
                })}
                <LabelList
                  dataKey={metricMode}
                  position="top"
                  formatter={(value: unknown) => {
                    const num = typeof value === 'number' ? value : Number(value);
                    if (!Number.isFinite(num) || num <= 0) return '';
                    return metricMode === 'percentage'
                      ? `${num.toFixed(0)}%`
                      : String(num);
                  }}
                  style={{
                    fill: '#0E1113',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#0E1113]/8 pt-2.5 font-mono text-[11px] text-[#5A5D57]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-[#0E1113]" />
              <span>Within ≤{thresholdMs}ms</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-[#D97706]" />
              <span>Straddles Limit</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-[#DC2626]" />
              <span>Exceeds &gt;{thresholdMs}ms</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#7E22CE]">
              <span className="h-2.5 w-2.5 bg-[#9333EA]" />
              <span>Critical &gt;{criticalThresholdMs}ms</span>
            </span>
          </div>
          <span className="tabular-nums">
            7 latency buckets · Trailing 60-minute window
          </span>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildHourlyAverageLatencySeries,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  formatLatencyMs,
  isCriticalLatency,
  type HealthCheckSample,
  type HourlyLatencySeries,
  type LatencyMinuteBucket,
} from '../../types/systemHealth';

export interface HourlyAverageLatencyChartProps {
  /** Pre-aggregated 60-minute average latency series from GET /api/system-health */
  hourlyLatency?: HourlyLatencySeries;
  /** Fallback raw probes if hourlyLatency is omitted */
  fallbackSamples?: readonly HealthCheckSample[];
  /** Custom admin alert threshold in milliseconds */
  thresholdMs?: number;
  /** Custom admin Critical Latency threshold in milliseconds */
  criticalThresholdMs?: number;
  /** Syncs with parent Live Mode (5s cleanup-managed interval) */
  liveMode?: boolean;
  /** ISO timestamp of latest probe sync */
  lastUpdatedAt?: string;
}

type WindowZoom = '60m' | '15m';

interface HourlyLatencyTooltipPayloadItem {
  payload?: LatencyMinuteBucket;
}

function formatUtcClockTime(iso?: string): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

function HourlyLatencyTooltip({
  active,
  payload,
  thresholdMs,
  criticalThresholdMs,
}: {
  active?: boolean;
  payload?: HourlyLatencyTooltipPayloadItem[];
  thresholdMs: number;
  criticalThresholdMs?: number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  const hasData = bucket.avgLatencyMs !== null;
  const isCritical =
    hasData &&
    criticalThresholdMs !== undefined &&
    isCriticalLatency(bucket.avgLatencyMs, criticalThresholdMs);
  const exceeds = hasData && (bucket.avgLatencyMs as number) > thresholdMs;

  return (
    <div className="border border-[#FDFCF9]/15 bg-[#0E1113] px-3.5 py-3 text-xs text-[#FDFCF9] shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-[#FDFCF9]/12 pb-1.5">
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#FDFCF9]/85">
          {bucket.minuteLabel} UTC{bucket.isCurrentMinute ? ' (Current)' : ''}
        </span>
        <span
          className={`font-mono text-[10px] font-bold uppercase ${
            !hasData
              ? 'text-[#FDFCF9]/55'
              : isCritical
                ? 'text-[#C084FC]'
                : exceeds
                  ? 'text-[#F87171]'
                  : 'text-[#4ADE80]'
          }`}
        >
          {!hasData
            ? 'No Probes'
            : isCritical
              ? 'Critical Latency'
              : exceeds
                ? 'Above Limit'
                : 'Nominal'}
        </span>
      </div>

      {!hasData ? (
        <p className="mt-2 font-mono text-[11px] text-[#FDFCF9]/65">
          No connected probes recorded during this minute.
        </p>
      ) : (
        <div className="mt-2 space-y-1 font-mono tabular-nums">
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Minute Average</span>
            <span
              className={`font-bold ${
                isCritical
                  ? 'text-[#C084FC]'
                  : exceeds
                    ? 'text-[#F87171]'
                    : 'text-[#FDFCF9]'
              }`}
            >
              {formatLatencyMs(bucket.avgLatencyMs)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Min / Peak</span>
            <span className="text-[#E5C169]">
              {formatLatencyMs(bucket.minLatencyMs)} –{' '}
              {formatLatencyMs(bucket.maxLatencyMs)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Probes in Minute</span>
            <span className="text-[#FDFCF9]">
              {bucket.connectedCount} / {bucket.sampleCount}
            </span>
          </div>
          <div className="flex items-center justify-between gap-5 border-t border-[#FDFCF9]/10 pt-1">
            <span className="text-[#FDFCF9]/65">Alert Threshold</span>
            <span className="text-[#FDFCF9]/75">{thresholdMs} ms</span>
          </div>
          {criticalThresholdMs !== undefined && (
            <div className="flex items-center justify-between gap-5">
              <span className="text-[#FDFCF9]/65">Critical Limit</span>
              <span
                className={
                  isCritical
                    ? 'font-bold text-[#C084FC]'
                    : 'text-[#FDFCF9]/75'
                }
              >
                {criticalThresholdMs} ms
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HourlyAverageLatencyChart({
  hourlyLatency,
  fallbackSamples = [],
  thresholdMs = DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  criticalThresholdMs = DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  liveMode = false,
  lastUpdatedAt,
}: HourlyAverageLatencyChartProps) {
  const [windowZoom, setWindowZoom] = useState<WindowZoom>('60m');
  const [showPeakLine, setShowPeakLine] = useState<boolean>(false);

  const resolvedSeries = useMemo<HourlyLatencySeries>(() => {
    const base =
      hourlyLatency && hourlyLatency.buckets.length === 60
        ? hourlyLatency
        : buildHourlyAverageLatencySeries(
            fallbackSamples,
            new Date(),
            thresholdMs,
          );

    // Re-evaluate threshold breach flags dynamically against the active admin threshold
    const buckets = base.buckets.map((bucket) => ({
      ...bucket,
      exceedsThreshold:
        bucket.avgLatencyMs !== null && bucket.avgLatencyMs > thresholdMs,
    }));
    const breachedMinutes = buckets.filter((b) => b.exceedsThreshold).length;

    return {
      ...base,
      thresholdMs,
      summary: {
        ...base.summary,
        breachedMinutes,
      },
      buckets,
    };
  }, [hourlyLatency, fallbackSamples, thresholdMs]);

  const { summary } = resolvedSeries;
  const displayedBuckets = useMemo(
    () =>
      windowZoom === '15m'
        ? resolvedSeries.buckets.slice(-15)
        : resolvedSeries.buckets,
    [resolvedSeries.buckets, windowZoom],
  );

  const yMax = useMemo(() => {
    const observedValues = displayedBuckets
      .flatMap((b) =>
        showPeakLine ? [b.avgLatencyMs, b.maxLatencyMs] : [b.avgLatencyMs],
      )
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const peak = observedValues.length > 0 ? Math.max(...observedValues) : 100;
    const headroom = Math.max(peak * 1.35, 100);
    return Math.ceil(headroom / 25) * 25;
  }, [displayedBuckets, showPeakLine]);

  const showThresholdLine = thresholdMs <= yMax * 1.15;
  const showCriticalLine = criticalThresholdMs <= yMax * 1.15;
  const effectiveYMax = Math.max(
    yMax,
    showThresholdLine ? Math.ceil((thresholdMs * 1.15) / 25) * 25 : 0,
    showCriticalLine ? Math.ceil((criticalThresholdMs * 1.15) / 25) * 25 : 0,
  );

  const isOverallHigh =
    summary.overallAvgMs !== null && summary.overallAvgMs > thresholdMs;

  return (
    <section
      aria-label="Average system latency over the last hour"
      data-testid="hourly-avg-latency-chart"
      className="border border-[#0E1113]/15 bg-[#FDFCF9]"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#0E1113]/12 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-[#0E1113]" />
            <h2 className="text-base font-semibold text-[#0E1113]">
              Last-Hour Average System Latency
            </h2>
            <span
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                isOverallHigh
                  ? 'border-[#D97706]/40 bg-[#FEF3C7]/70 text-[#92400E]'
                  : 'border-[#16A34A]/30 bg-[#16A34A]/8 text-[#15803D]'
              }`}
            >
              {isOverallHigh ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              <span>
                {summary.overallAvgMs !== null
                  ? `1h Avg: ${summary.overallAvgMs} ms`
                  : 'Awaiting Samples'}
              </span>
            </span>
            {liveMode ? (
              <span
                data-testid="hourly-latency-live-indicator"
                className="inline-flex items-center gap-1 border border-[#16A34A]/35 bg-[#16A34A]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#15803D]"
              >
                <Radio className="h-3 w-3 animate-pulse" />
                <span>Live · 5s</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 border border-[#0E1113]/15 bg-[#F4F2EC] px-2 py-0.5 font-mono text-[11px] text-[#5A5D57]">
                <Clock className="h-3 w-3" />
                <span>Syncs with Live Mode</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#5A5D57]">
            1-minute averaged response time over the trailing 60 minutes ·{' '}
            <span
              data-testid="hourly-latency-sample-count"
              className="font-mono tabular-nums text-[#0E1113]"
            >
              {summary.totalSamples} probe
              {summary.totalSamples === 1 ? '' : 's'}
            </span>{' '}
            across{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {summary.activeMinutes}/60
            </span>{' '}
            minutes · Updated{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {formatUtcClockTime(lastUpdatedAt ?? resolvedSeries.generatedAt)} UTC
            </span>
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Hourly latency time window"
            className="inline-flex border border-[#0E1113]/20 bg-[#F4F2EC]"
          >
            <button
              type="button"
              onClick={() => setWindowZoom('60m')}
              aria-pressed={windowZoom === '60m'}
              data-testid="hourly-latency-window-60m"
              className={`px-2.5 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                windowZoom === '60m'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
              }`}
            >
              Last 60m
            </button>
            <button
              type="button"
              onClick={() => setWindowZoom('15m')}
              aria-pressed={windowZoom === '15m'}
              data-testid="hourly-latency-window-15m"
              className={`px-2.5 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                windowZoom === '15m'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
              }`}
            >
              Last 15m
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPeakLine((prev) => !prev)}
            aria-pressed={showPeakLine}
            data-testid="hourly-latency-peak-toggle"
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
              showPeakLine
                ? 'border-[#B45309] bg-[#B45309] text-[#FDFCF9]'
                : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
            }`}
          >
            <Activity className="h-3 w-3 shrink-0" />
            <span>{showPeakLine ? 'Peak Line: On' : 'Peak Line: Off'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/12 sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            1h Weighted Average
          </p>
          <p
            data-testid="hourly-latency-overall-avg"
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              isOverallHigh ? 'text-[#B45309]' : 'text-[#0E1113]'
            }`}
          >
            {formatLatencyMs(summary.overallAvgMs)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Current Minute Avg
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {formatLatencyMs(summary.latestMinuteAvgMs)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Peak Minute Avg
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              summary.maxMinuteAvgMs !== null &&
              summary.maxMinuteAvgMs > thresholdMs
                ? 'text-[#DC2626]'
                : 'text-[#0E1113]'
            }`}
          >
            {formatLatencyMs(summary.maxMinuteAvgMs)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Minutes Over {thresholdMs}ms
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              summary.breachedMinutes > 0 ? 'text-[#B45309]' : 'text-[#15803D]'
            }`}
          >
            {summary.breachedMinutes}
            <span className="text-sm font-medium text-[#5A5D57]">
              {' '}
              / {summary.activeMinutes}
            </span>
          </p>
        </div>
      </div>

      {/* Recharts LineChart Canvas */}
      <div className="px-4 pt-5 pb-3 sm:px-5">
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayedBuckets}
              margin={{ top: 14, right: 28, left: 0, bottom: 4 }}
            >
              <CartesianGrid
                stroke="rgba(14,17,19,0.08)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="minuteLabel"
                tick={{
                  fill: '#5A5D57',
                  fontSize: 11,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(14,17,19,0.16)' }}
                interval={windowZoom === '15m' ? 1 : 7}
              />

              <YAxis
                domain={[0, effectiveYMax]}
                tickFormatter={(value: number) => `${value}ms`}
                tick={{
                  fill: '#5A5D57',
                  fontSize: 11,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                tickLine={false}
                axisLine={false}
                width={54}
              />

              <Tooltip
                content={
                  <HourlyLatencyTooltip
                    thresholdMs={thresholdMs}
                    criticalThresholdMs={criticalThresholdMs}
                  />
                }
                cursor={{
                  stroke: 'rgba(14,17,19,0.2)',
                  strokeWidth: 1,
                  strokeDasharray: '3 3',
                }}
              />

              {showThresholdLine && (
                <ReferenceLine
                  y={thresholdMs}
                  stroke="#B45309"
                  strokeOpacity={0.75}
                  strokeDasharray="5 4"
                  strokeWidth={1.25}
                  label={{
                    value: `Limit ${thresholdMs}ms`,
                    position: 'insideBottomLeft',
                    fill: '#B45309',
                    fontSize: 10,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                />
              )}

              {showCriticalLine && (
                <ReferenceLine
                  y={criticalThresholdMs}
                  stroke="#9333EA"
                  strokeOpacity={0.85}
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: `Critical ${criticalThresholdMs}ms`,
                    position: 'insideTopLeft',
                    fill: '#7E22CE',
                    fontSize: 10,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                />
              )}

              {showPeakLine && (
                <Line
                  type="monotone"
                  dataKey="maxLatencyMs"
                  name="Minute Peak (ms)"
                  stroke="#B45309"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  connectNulls
                  isAnimationActive={false}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#B45309',
                    stroke: '#FDFCF9',
                    strokeWidth: 1.5,
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="avgLatencyMs"
                name="Average Latency (ms)"
                stroke="#0E1113"
                strokeWidth={2.25}
                connectNulls
                isAnimationActive={false}
                dot={(dotProps) => {
                  const { cx, cy, payload, index } = dotProps as {
                    cx?: number;
                    cy?: number;
                    payload?: LatencyMinuteBucket;
                    index?: number;
                  };
                  if (
                    cx === undefined ||
                    cy === undefined ||
                    !payload ||
                    payload.avgLatencyMs === null
                  ) {
                    return <g key={`hourly-lat-empty-${index}`} />;
                  }
                  const isCriticalPoint = isCriticalLatency(
                    payload.avgLatencyMs,
                    criticalThresholdMs,
                  );
                  const dotFill = isCriticalPoint
                    ? '#9333EA'
                    : payload.exceedsThreshold
                      ? '#DC2626'
                      : '#0E1113';
                  return (
                    <g
                      key={`hourly-lat-dot-${payload.minuteStartIso}`}
                      data-testid={
                        isCriticalPoint
                          ? 'hourly-critical-latency-point'
                          : 'hourly-latency-point'
                      }
                    >
                      {(payload.isCurrentMinute || isCriticalPoint) && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8.5}
                          fill={dotFill}
                          fillOpacity={isCriticalPoint ? 0.22 : 0.16}
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isCriticalPoint || payload.isCurrentMinute ? 4.75 : 3.25}
                        fill={dotFill}
                        stroke="#FDFCF9"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                }}
                activeDot={{
                  r: 5.5,
                  fill: '#9333EA',
                  stroke: '#FDFCF9',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Footer */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#0E1113]/8 pt-2.5 font-mono text-[11px] text-[#5A5D57]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-[#0E1113]" />
              <span>1-Min Avg Latency (ms)</span>
            </span>
            {showPeakLine && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 border-t border-dashed border-[#B45309]" />
                <span>Minute Peak (ms)</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
              <span>Exceeds {thresholdMs}ms Limit</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#7E22CE]">
              <span className="h-2 w-2 rounded-full bg-[#9333EA]" />
              <span>Critical (&gt;{criticalThresholdMs}ms)</span>
            </span>
          </div>
          <span className="tabular-nums">
            Trailing {windowZoom === '15m' ? '15' : '60'} minutes (UTC) ·
            Updates every 5s in Live Mode
          </span>
        </div>
      </div>
    </section>
  );
}

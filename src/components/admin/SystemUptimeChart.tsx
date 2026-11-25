import { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Radio,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildUptime24hSeries,
  formatLatencyMs,
  type HealthCheckSample,
  type Uptime24hSeries,
  type UptimeHourlyBucket,
} from '../../types/systemHealth';

export interface SystemUptimeChartProps {
  /** Pre-aggregated 24-hour hourly uptime telemetry from GET /api/system-health */
  uptime24h?: Uptime24hSeries;
  /** Optional fallback raw samples used if uptime24h is omitted */
  fallbackSamples?: readonly HealthCheckSample[];
  /** Syncs with parent Live Mode 5-second polling badge */
  liveMode?: boolean;
}

type ChartDisplayMode = 'area' | 'bars';
type YScaleMode = 'full' | 'sla';

interface UptimeTooltipPayloadItem {
  payload?: UptimeHourlyBucket;
}

function getBucketColor(status: UptimeHourlyBucket['status']): string {
  switch (status) {
    case 'operational':
      return '#16A34A';
    case 'degraded':
      return '#D97706';
    case 'incident':
      return '#DC2626';
    default:
      return '#D6D3CB';
  }
}

function formatHourRangeUtc(hourStartIso: string, fallbackLabel: string): string {
  const parsed = new Date(hourStartIso);
  if (Number.isNaN(parsed.getTime())) return `${fallbackLabel} UTC`;
  const hh = String(parsed.getUTCHours()).padStart(2, '0');
  const monthDay = parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
  return `${monthDay} · ${hh}:00–${hh}:59 UTC`;
}

function UptimeTooltip({
  active,
  payload,
  slaTargetPercent,
}: {
  active?: boolean;
  payload?: UptimeTooltipPayloadItem[];
  slaTargetPercent: number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const bucket = payload[0]?.payload;
  if (!bucket) return null;

  const statusMeta = (() => {
    switch (bucket.status) {
      case 'operational':
        return { label: 'Operational', colorClass: 'text-[#4ADE80]' };
      case 'degraded':
        return { label: 'Degraded', colorClass: 'text-[#FBBF24]' };
      case 'incident':
        return { label: 'Incident', colorClass: 'text-[#F87171]' };
      default:
        return { label: 'No Probes', colorClass: 'text-[#FDFCF9]/55' };
    }
  })();

  return (
    <div className="border border-[#FDFCF9]/15 bg-[#0E1113] px-3.5 py-3 text-xs text-[#FDFCF9] shadow-lg">
      <div className="flex items-center justify-between gap-4 border-b border-[#FDFCF9]/12 pb-1.5">
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[#FDFCF9]/85">
          {formatHourRangeUtc(bucket.hourStartIso, bucket.hourLabel)}
          {bucket.isCurrentHour ? ' (Now)' : ''}
        </span>
        <span
          className={`font-mono text-[10px] font-bold uppercase ${statusMeta.colorClass}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {bucket.totalChecks === 0 ? (
        <p className="mt-2 font-mono text-[11px] text-[#FDFCF9]/65">
          No health probes recorded during this hour.
        </p>
      ) : (
        <div className="mt-2 space-y-1 font-mono tabular-nums">
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Hourly Uptime</span>
            <span className={`font-bold ${statusMeta.colorClass}`}>
              {bucket.uptimePercent !== null
                ? `${bucket.uptimePercent.toFixed(1)}%`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Healthy Probes</span>
            <span className="text-[#FDFCF9]">
              {bucket.healthyChecks} / {bucket.totalChecks}
            </span>
          </div>
          {bucket.degradedChecks > 0 && (
            <div className="flex items-center justify-between gap-5">
              <span className="text-[#FDFCF9]/65">Failed / Degraded</span>
              <span className="font-semibold text-[#F87171]">
                {bucket.degradedChecks}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-5">
            <span className="text-[#FDFCF9]/65">Avg DB Latency</span>
            <span className="text-[#FDFCF9]/85">
              {formatLatencyMs(bucket.avgLatencyMs)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-5 border-t border-[#FDFCF9]/10 pt-1">
            <span className="text-[#FDFCF9]/65">SLA Target</span>
            <span className="text-[#FDFCF9]/75">
              {slaTargetPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemUptimeChart({
  uptime24h,
  fallbackSamples = [],
  liveMode = false,
}: SystemUptimeChartProps) {
  const gradientId = useId();
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('area');
  const [yScaleMode, setYScaleMode] = useState<YScaleMode>('full');

  const resolvedSeries = useMemo<Uptime24hSeries>(() => {
    if (uptime24h && uptime24h.buckets.length === 24) {
      return uptime24h;
    }
    return buildUptime24hSeries(fallbackSamples);
  }, [uptime24h, fallbackSamples]);

  const { summary, buckets } = resolvedSeries;
  const yDomain: [number, number] = yScaleMode === 'sla' ? [90, 100] : [0, 100];
  const yTicks = yScaleMode === 'sla' ? [90, 92.5, 95, 97.5, 100] : [0, 25, 50, 75, 100];

  const isSingleObservedHour = summary.hoursWithData <= 1;

  return (
    <section
      aria-label="System uptime percentage over the last 24 hours"
      data-testid="system-uptime-24h-chart"
      className="border border-[#0E1113]/15 bg-[#FDFCF9]"
    >
      {/* Card Header */}
      <div className="flex flex-col gap-4 border-b border-[#0E1113]/12 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#0E1113]" />
            <h2 className="text-base font-semibold text-[#0E1113]">
              24-Hour System Uptime
            </h2>
            <span
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                summary.meetsSla
                  ? 'border-[#16A34A]/30 bg-[#16A34A]/8 text-[#15803D]'
                  : 'border-[#DC2626]/35 bg-[#FEF2F2] text-[#DC2626]'
              }`}
            >
              {summary.meetsSla ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>
                {summary.meetsSla
                  ? `Meeting ${summary.slaTargetPercent.toFixed(1)}% SLA`
                  : `Below ${summary.slaTargetPercent.toFixed(1)}% SLA`}
              </span>
            </span>
            {liveMode && (
              <span
                data-testid="uptime-live-mode-indicator"
                className="inline-flex items-center gap-1 border border-[#16A34A]/35 bg-[#16A34A]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#15803D]"
              >
                <Radio className="h-3 w-3 animate-pulse" />
                <span>Live · 5s</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#5A5D57]">
            Hourly availability percentage across the trailing 24-hour UTC window ·{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {summary.totalChecks} probe{summary.totalChecks === 1 ? '' : 's'}
            </span>{' '}
            recorded across{' '}
            <span className="font-mono tabular-nums text-[#0E1113]">
              {summary.hoursWithData}/24
            </span>{' '}
            hours
          </p>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Uptime chart display style"
            className="inline-flex border border-[#0E1113]/20 bg-[#F4F2EC]"
          >
            <button
              type="button"
              onClick={() => setChartMode('area')}
              aria-pressed={chartMode === 'area'}
              data-testid="uptime-chart-mode-area"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                chartMode === 'area'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
              }`}
            >
              <TrendingUp className="h-3 w-3 shrink-0" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bars')}
              aria-pressed={chartMode === 'bars'}
              data-testid="uptime-chart-mode-bars"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                chartMode === 'bars'
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'text-[#0E1113]/75 hover:bg-[#0E1113]/8 hover:text-[#0E1113]'
              }`}
            >
              <BarChart3 className="h-3 w-3 shrink-0" />
              <span>Hourly Bars</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setYScaleMode((prev) => (prev === 'full' ? 'sla' : 'full'))
            }
            aria-pressed={yScaleMode === 'sla'}
            data-testid="uptime-scale-toggle"
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
              yScaleMode === 'sla'
                ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
            }`}
          >
            <Clock className="h-3 w-3 shrink-0" />
            <span>{yScaleMode === 'sla' ? 'Scale: 90–100%' : 'Scale: 0–100%'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/12 sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            24h Availability
          </p>
          <p
            data-testid="uptime-24h-overall-value"
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              summary.meetsSla ? 'text-[#15803D]' : 'text-[#DC2626]'
            }`}
          >
            {summary.overallUptimePercent.toFixed(1)}%
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">SLA Target</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary.slaTargetPercent.toFixed(1)}%
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Lowest Hourly Bucket
          </p>
          <p
            className={`mt-1 font-mono text-lg font-bold tabular-nums ${
              summary.lowestBucketPercent !== null &&
              summary.lowestBucketPercent < summary.slaTargetPercent
                ? 'text-[#B45309]'
                : 'text-[#0E1113]'
            }`}
          >
            {summary.lowestBucketPercent !== null
              ? `${summary.lowestBucketPercent.toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-[#5A5D57]">
            Healthy / Total Checks
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0E1113]">
            {summary.healthyChecks}
            <span className="text-sm font-medium text-[#5A5D57]">
              {' '}
              / {summary.totalChecks}
            </span>
          </p>
        </div>
      </div>

      {/* Recharts 24-Hour Uptime Canvas */}
      <div className="px-4 pt-5 pb-3 sm:px-5">
        <div className="w-full" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={buckets}
              margin={{ top: 14, right: 28, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient
                  id={`uptimeArea-${gradientId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="rgba(14,17,19,0.08)"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="hourLabel"
                tick={{
                  fill: '#5A5D57',
                  fontSize: 11,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(14,17,19,0.16)' }}
                interval={2}
              />

              <YAxis
                domain={yDomain}
                ticks={yTicks}
                tickFormatter={(value: number) => `${value}%`}
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
                  <UptimeTooltip slaTargetPercent={summary.slaTargetPercent} />
                }
                cursor={{
                  stroke: 'rgba(14,17,19,0.2)',
                  strokeWidth: 1,
                  strokeDasharray: '3 3',
                }}
              />

              <ReferenceLine
                y={summary.slaTargetPercent}
                stroke="#0E1113"
                strokeOpacity={0.45}
                strokeDasharray="4 4"
                strokeWidth={1.25}
                label={{
                  value: `SLA ${summary.slaTargetPercent.toFixed(1)}%`,
                  position: 'insideBottomLeft',
                  fill: '#5A5D57',
                  fontSize: 10,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />

              {chartMode === 'bars' || isSingleObservedHour ? (
                <Bar
                  dataKey="uptimePercent"
                  name="Hourly Uptime %"
                  barSize={chartMode === 'bars' ? 18 : 14}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                >
                  {buckets.map((bucket) => (
                    <Cell
                      key={bucket.hourStartIso}
                      fill={getBucketColor(bucket.status)}
                      fillOpacity={chartMode === 'bars' ? 0.88 : 0.22}
                    />
                  ))}
                </Bar>
              ) : null}

              {chartMode === 'area' && (
                <Area
                  type="monotone"
                  dataKey="uptimePercent"
                  name="System Uptime %"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fill={`url(#uptimeArea-${gradientId})`}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={(dotProps) => {
                    const { cx, cy, payload, index } = dotProps as {
                      cx?: number;
                      cy?: number;
                      payload?: UptimeHourlyBucket;
                      index?: number;
                    };
                    if (
                      cx === undefined ||
                      cy === undefined ||
                      !payload ||
                      payload.uptimePercent === null
                    ) {
                      return <g key={`uptime-empty-${index}`} />;
                    }
                    const dotColor = getBucketColor(payload.status);
                    return (
                      <g
                        key={`uptime-dot-${payload.hourStartIso}`}
                        data-testid="uptime-hourly-point"
                      >
                        {payload.isCurrentHour && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={8}
                            fill={dotColor}
                            fillOpacity={0.18}
                          />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={payload.isCurrentHour ? 4.5 : 3.5}
                          fill={dotColor}
                          stroke="#FDFCF9"
                          strokeWidth={1.5}
                        />
                      </g>
                    );
                  }}
                  activeDot={{
                    r: 5.5,
                    fill: '#16A34A',
                    stroke: '#FDFCF9',
                    strokeWidth: 2,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#0E1113]/8 pt-2.5 font-mono text-[11px] text-[#5A5D57]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#16A34A]" />
              <span>Operational (≥{summary.slaTargetPercent.toFixed(1)}%)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#D97706]" />
              <span>Degraded (95–99.8%)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 bg-[#DC2626]" />
              <span>Incident (&lt;95%)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t border-dashed border-[#0E1113]/60" />
              <span>SLA Target ({summary.slaTargetPercent.toFixed(1)}%)</span>
            </span>
          </div>
          <span className="tabular-nums">
            UTC hourly buckets · Empty hours await probe data
          </span>
        </div>
      </div>
    </section>
  );
}

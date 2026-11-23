import { jsPDF } from 'jspdf';
import {
  buildHourlyLatencyHistogram,
  buildUptime24hSeries,
  calculatePercentile,
  classifyHistogramBucketBand,
  countCriticalLatencyPoints,
  countLatencyThresholdBreaches,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_HEALTH_ALERT_PREFERENCES,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  formatLatencyMs,
  getRecentConnectionAttemptLogs,
  HEALTH_ALERT_CHANNELS,
  sanitizeCriticalLatencyThresholdMs,
  sanitizeHealthAlertPreferences,
  sanitizeLatencyThresholdMs,
  SLA_AVAILABILITY_ALERT_FLOOR_PERCENT,
  type ConnectionAttemptLogEntry,
  type LatencyHistogramBucket,
  type SystemHealthAlertPreferences,
  type SystemHealthSnapshot,
  type Uptime24hSeries,
  type UptimeHourlyBucket,
} from './systemHealthTypes.ts';

export interface SystemHealthPdfReportOptions {
  /** Active warning/alert threshold in ms (default 500) */
  alertThresholdMs?: number;
  /** Active critical latency threshold in ms (default 800) */
  criticalThresholdMs?: number;
  /** Active alert channel toggle states */
  alertPreferences?: SystemHealthAlertPreferences;
  /** Report generation timestamp override (for deterministic tests) */
  generatedAt?: Date;
}

export interface SystemHealth24hReportSummary {
  service: string;
  overallStatus: SystemHealthSnapshot['overallStatus'];
  generatedAtIso: string;
  windowStartIso: string;
  windowEndIso: string;
  uptimeFormatted: string;
  startedAtIso: string;
  database: SystemHealthSnapshot['database'];
  runtime: SystemHealthSnapshot['runtime'];
  thresholds: {
    alertThresholdMs: number;
    criticalThresholdMs: number;
    slaTargetPercent: number;
  };
  alertPreferences: SystemHealthAlertPreferences;
  uptime24h: Uptime24hSeries;
  activeHourlyBuckets: UptimeHourlyBucket[];
  latencyStats: {
    sampleCount: number;
    averageMs: number | null;
    medianMs: number | null;
    p95Ms: number | null;
    minMs: number | null;
    maxMs: number | null;
    thresholdBreaches: number;
    criticalCount: number;
  };
  histogramBuckets: LatencyHistogramBucket[];
  histogramConnectedSamples: number;
  recentConnectionLogs: ConnectionAttemptLogEntry[];
}

export function buildSystemHealthPdfFilename(now: Date = new Date()): string {
  const isoStamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/:/g, '-');
  return `system-health-24h-report-${isoStamp}Z.pdf`;
}

function toPdfSafeAscii(value: string): string {
  return value
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u00b7/g, '|')
    .replace(/[^\x20-\x7E]/g, '');
}

function formatUtcStamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return toPdfSafeAscii(iso);
  return `${parsed.toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

function formatUtcClock(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return toPdfSafeAscii(iso);
  return `${parsed.toISOString().slice(11, 19)} UTC`;
}

/**
 * Pure aggregator that compiles a normalized 24-hour system health report model
 * from a live SystemHealthSnapshot and the admin's active thresholds/toggles.
 */
export function build24hHealthReportSummary(
  snapshot: SystemHealthSnapshot,
  options?: SystemHealthPdfReportOptions,
): SystemHealth24hReportSummary {
  const generatedAt = options?.generatedAt ?? new Date();
  const alertThresholdMs = sanitizeLatencyThresholdMs(
    options?.alertThresholdMs,
    DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  );
  const criticalThresholdMs = sanitizeCriticalLatencyThresholdMs(
    options?.criticalThresholdMs,
    DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  );
  const alertPreferences = sanitizeHealthAlertPreferences(
    options?.alertPreferences,
    DEFAULT_HEALTH_ALERT_PREFERENCES,
  );

  const uptime24h =
    snapshot.uptime24h && snapshot.uptime24h.buckets.length === 24
      ? snapshot.uptime24h
      : buildUptime24hSeries(snapshot.recentChecks, generatedAt);

  const rawHistogram =
    snapshot.hourlyLatencyHistogram &&
    snapshot.hourlyLatencyHistogram.buckets.length > 0
      ? snapshot.hourlyLatencyHistogram
      : buildHourlyLatencyHistogram(
          snapshot.recentChecks,
          generatedAt,
          alertThresholdMs,
        );

  const histogramBuckets = rawHistogram.buckets.map((bucket) => ({
    ...bucket,
    band: classifyHistogramBucketBand(
      bucket.minMs,
      bucket.maxMs,
      alertThresholdMs,
    ),
  }));

  const connectedLatencies = snapshot.recentChecks
    .filter(
      (check) =>
        check.databaseStatus === 'connected' &&
        check.latencyMs !== null &&
        Number.isFinite(check.latencyMs),
    )
    .map((check) => Math.max(0, Math.round(check.latencyMs as number)));

  const sortedLatencies = [...connectedLatencies].sort((a, b) => a - b);
  const averageMs =
    connectedLatencies.length > 0
      ? Math.round(
          connectedLatencies.reduce((acc, v) => acc + v, 0) /
            connectedLatencies.length,
        )
      : null;

  const activeHourlyBuckets = uptime24h.buckets.filter(
    (bucket) => bucket.totalChecks > 0,
  );

  const windowEndIso = generatedAt.toISOString();
  const windowStartIso = new Date(
    generatedAt.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    service: snapshot.service,
    overallStatus: snapshot.overallStatus,
    generatedAtIso: windowEndIso,
    windowStartIso,
    windowEndIso,
    uptimeFormatted: snapshot.uptimeFormatted,
    startedAtIso: snapshot.startedAt,
    database: snapshot.database,
    runtime: snapshot.runtime,
    thresholds: {
      alertThresholdMs,
      criticalThresholdMs,
      slaTargetPercent: SLA_AVAILABILITY_ALERT_FLOOR_PERCENT,
    },
    alertPreferences,
    uptime24h,
    activeHourlyBuckets,
    latencyStats: {
      sampleCount: connectedLatencies.length,
      averageMs,
      medianMs:
        rawHistogram.summary.medianMs ?? calculatePercentile(sortedLatencies, 50),
      p95Ms:
        rawHistogram.summary.p95Ms ?? calculatePercentile(sortedLatencies, 95),
      minMs:
        rawHistogram.summary.minMs ??
        (sortedLatencies.length > 0 ? sortedLatencies[0] : null),
      maxMs:
        rawHistogram.summary.maxMs ??
        (sortedLatencies.length > 0
          ? sortedLatencies[sortedLatencies.length - 1]
          : null),
      thresholdBreaches: countLatencyThresholdBreaches(
        snapshot.recentChecks,
        alertThresholdMs,
      ),
      criticalCount: countCriticalLatencyPoints(
        snapshot.recentChecks.map((c) =>
          c.databaseStatus === 'connected' ? c.latencyMs : null,
        ),
        criticalThresholdMs,
      ),
    },
    histogramBuckets,
    histogramConnectedSamples: rawHistogram.summary.totalConnectedSamples,
    recentConnectionLogs: getRecentConnectionAttemptLogs(
      snapshot.recentChecks,
      5,
    ),
  };
}

/**
 * Generates a vector-crisp A4 PDF summary report of system health metrics over
 * the past 24 hours and returns raw binary PDF bytes (Uint8Array).
 */
export function generateSystemHealthPdfBytes(
  snapshot: SystemHealthSnapshot,
  options?: SystemHealthPdfReportOptions,
): Uint8Array {
  const report = build24hHealthReportSummary(snapshot, options);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: false,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89
  const marginX = 38;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  // Color palette (Swiss-editorial Sport Castle operations theme)
  const INK: [number, number, number] = [14, 17, 19];
  const MUTED: [number, number, number] = [90, 93, 87];
  const PARCHMENT: [number, number, number] = [244, 242, 236];
  const CARD_BG: [number, number, number] = [253, 252, 249];
  const BORDER: [number, number, number] = [214, 212, 205];
  const GREEN: [number, number, number] = [22, 163, 74];
  const AMBER: [number, number, number] = [217, 119, 6];
  const RED: [number, number, number] = [220, 38, 38];
  const PURPLE: [number, number, number] = [147, 51, 234];

  const isOperational = report.overallStatus === 'operational';
  const isDbConnected = report.database.status === 'connected';
  const overallUptime = report.uptime24h.summary.overallUptimePercent;
  const slaMet = overallUptime >= report.thresholds.slaTargetPercent;

  // ── 1. TOP MASTHEAD BANNER ────────────────────────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageWidth, 86, 'F');

  doc.setTextColor(229, 193, 105);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text('SPORT CASTLE | BACKEND OPERATIONS TELEMETRY', marginX, 26);

  doc.setTextColor(253, 252, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('24-Hour System Health Summary Report', marginX, 49);

  doc.setTextColor(195, 196, 190);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Window: ${formatUtcStamp(report.windowStartIso)} -> ${formatUtcStamp(report.windowEndIso)}`,
    marginX,
    68,
  );

  // Status badge on right of header
  const badgeText = isOperational ? 'OPERATIONAL' : 'DEGRADED';
  const badgeColor = isOperational ? GREEN : RED;
  const badgeW = 94;
  const badgeH = 22;
  const badgeX = pageWidth - marginX - badgeW;
  const badgeY = 30;
  doc.setFillColor(...badgeColor);
  doc.rect(badgeX, badgeY, badgeW, badgeH, 'F');
  doc.setTextColor(253, 252, 249);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(badgeText, badgeX + badgeW / 2, badgeY + 14, { align: 'center' });

  y = 104;

  // ── 2. EXECUTIVE 4-COLUMN KPI STRIP ───────────────────────────────────────
  const kpiGap = 8;
  const kpiW = (contentWidth - kpiGap * 3) / 4;
  const kpiH = 66;

  const kpiCards: Array<{
    label: string;
    value: string;
    sub: string;
    accent: [number, number, number];
  }> = [
    {
      label: '24H OVERALL UPTIME',
      value: `${overallUptime.toFixed(2)}%`,
      sub: `${slaMet ? 'Meets' : 'Below'} 99.9% SLA | ${report.uptime24h.summary.totalChecks} probes`,
      accent: slaMet ? GREEN : RED,
    },
    {
      label: 'CLOUD SQL INSTANCE',
      value: isDbConnected ? 'Connected' : 'Disconnected',
      sub: `Live: ${toPdfSafeAscii(formatLatencyMs(report.database.latencyMs))} | Pool ${report.database.pool.total}/${report.database.pool.idle}`,
      accent: isDbConnected ? GREEN : RED,
    },
    {
      label: 'LATENCY (AVG / P95)',
      value:
        report.latencyStats.averageMs !== null
          ? `${report.latencyStats.averageMs} / ${report.latencyStats.p95Ms ?? '-'} ms`
          : 'N/A',
      sub:
        report.latencyStats.minMs !== null && report.latencyStats.maxMs !== null
          ? `Range: ${report.latencyStats.minMs}-${report.latencyStats.maxMs} ms`
          : 'Awaiting samples',
      accent: INK,
    },
    {
      label: 'THRESHOLD & CRITICAL',
      value: `${report.latencyStats.thresholdBreaches} / ${report.latencyStats.criticalCount}`,
      sub: `Alert >${report.thresholds.alertThresholdMs}ms | Crit >${report.thresholds.criticalThresholdMs}ms`,
      accent:
        report.latencyStats.criticalCount > 0
          ? PURPLE
          : report.latencyStats.thresholdBreaches > 0
            ? AMBER
            : GREEN,
    },
  ];

  kpiCards.forEach((card, idx) => {
    const cx = marginX + idx * (kpiW + kpiGap);
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.rect(cx, y, kpiW, kpiH, 'FD');

    // Top 2.5pt accent hairline
    doc.setFillColor(...card.accent);
    doc.rect(cx, y, kpiW, 2.5, 'F');

    doc.setTextColor(...MUTED);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(card.label, cx + 8, y + 16);

    doc.setTextColor(...card.accent);
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text(card.value, cx + 8, y + 36);

    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(toPdfSafeAscii(card.sub), cx + 8, y + 54, {
      maxWidth: kpiW - 14,
    });
  });

  y += kpiH + 18;

  // ── 3. 24-HOUR SYSTEM UPTIME VECTOR BAR CHART ─────────────────────────────
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. System Uptime Percentage (Past 24 Hours, UTC)', marginX, y);

  doc.setTextColor(...MUTED);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Active Hours: ${report.uptime24h.summary.hoursWithData}/24 | Healthy Probes: ${report.uptime24h.summary.healthyChecks} | Degraded: ${report.uptime24h.summary.degradedChecks}`,
    pageWidth - marginX,
    y,
    { align: 'right' },
  );
  y += 8;

  const uptimeChartH = 112;
  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.rect(marginX, y, contentWidth, uptimeChartH, 'FD');

  const plotLeft = marginX + 34;
  const plotRight = pageWidth - marginX - 12;
  const plotTop = y + 14;
  const plotBottom = y + uptimeChartH - 22;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  // Horizontal gridlines (0%, 50%, 100%)
  [0, 50, 100].forEach((pct) => {
    const gy = plotBottom - (pct / 100) * plotH;
    doc.setDrawColor(230, 228, 222);
    doc.setLineWidth(0.5);
    doc.line(plotLeft, gy, plotRight, gy);

    doc.setTextColor(...MUTED);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.text(`${pct}%`, plotLeft - 5, gy + 2.5, { align: 'right' });
  });

  // 24 Hourly Bars
  const slotW = plotW / 24;
  const barW = Math.max(6, slotW - 4);
  report.uptime24h.buckets.forEach((bucket, idx) => {
    const bx = plotLeft + idx * slotW + (slotW - barW) / 2;
    if (bucket.totalChecks === 0 || bucket.uptimePercent === null) {
      doc.setFillColor(232, 229, 222);
      doc.rect(bx, plotBottom - 4, barW, 4, 'F');
    } else {
      const clamped = Math.max(2, Math.min(100, bucket.uptimePercent));
      const bh = (clamped / 100) * plotH;
      const barColor =
        bucket.uptimePercent >= 99.9
          ? GREEN
          : bucket.uptimePercent >= 95
            ? AMBER
            : RED;
      doc.setFillColor(...barColor);
      doc.rect(bx, plotBottom - bh, barW, bh, 'F');
    }

    // Hour tick label every 3 hours + latest hour
    if (idx % 3 === 0 || idx === 23) {
      doc.setTextColor(...MUTED);
      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.text(bucket.hourLabel, bx + barW / 2, plotBottom + 11, {
        align: 'center',
      });
    }
  });

  // SLA 99.9% indicator line
  const slaY = plotBottom - (99.9 / 100) * plotH;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.75);
  doc.line(plotLeft, slaY, plotRight, slaY);

  y += uptimeChartH + 18;

  // ── 4. LAST-HOUR RESPONSE TIME DISTRIBUTION HISTOGRAM ─────────────────────
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Response Time Distribution (Trailing 60 Minutes)', marginX, y);

  doc.setTextColor(...MUTED);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Connected Probes: ${report.histogramConnectedSamples} | Median P50: ${toPdfSafeAscii(formatLatencyMs(report.latencyStats.medianMs))}`,
    pageWidth - marginX,
    y,
    { align: 'right' },
  );
  y += 8;

  const histBoxH = 122;
  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.rect(marginX, y, contentWidth, histBoxH, 'FD');

  const maxBucketCount = Math.max(
    1,
    ...report.histogramBuckets.map((b) => b.count),
  );
  const labelColW = 64;
  const statsColW = 72;
  const barTrackX = marginX + 12 + labelColW;
  const barTrackW = contentWidth - 24 - labelColW - statsColW;
  const rowStep = 15.5;

  report.histogramBuckets.forEach((bucket, idx) => {
    const ry = y + 14 + idx * rowStep;
    const isCriticalBucket = bucket.minMs > report.thresholds.criticalThresholdMs;
    const fill: [number, number, number] = isCriticalBucket
      ? PURPLE
      : bucket.band === 'breach'
        ? RED
        : bucket.band === 'warning'
          ? AMBER
          : INK;

    doc.setTextColor(...INK);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(toPdfSafeAscii(bucket.label), marginX + 10, ry + 7);

    // Track background
    doc.setFillColor(...PARCHMENT);
    doc.rect(barTrackX, ry, barTrackW, 9, 'F');

    // Bar fill
    if (bucket.count > 0) {
      const fillW = Math.max(4, (bucket.count / maxBucketCount) * barTrackW);
      doc.setFillColor(...fill);
      doc.rect(barTrackX, ry, fillW, 9, 'F');
    }

    doc.setTextColor(...MUTED);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `${bucket.count} (${bucket.percentage.toFixed(0)}%)`,
      pageWidth - marginX - 10,
      ry + 7,
      { align: 'right' },
    );
  });

  y += histBoxH + 18;

  // ── 5. SERVICE DIAGNOSTICS & ALERT CONFIGURATION (2-COL) ──────────────────
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Runtime Diagnostics & Alert Configuration', marginX, y);
  y += 8;

  const diagBoxH = 92;
  const colGap = 10;
  const halfW = (contentWidth - colGap) / 2;

  // Left card: Runtime & Database
  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(marginX, y, halfW, diagBoxH, 'FD');

  doc.setTextColor(...INK);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('SERVICE & RUNTIME FOOTPRINT', marginX + 10, y + 15);

  const leftRows: Array<[string, string]> = [
    ['Service ID', report.service],
    ['Database Engine', report.database.engine],
    [
      'DB Pool',
      `${report.database.pool.total} total / ${report.database.pool.idle} idle / ${report.database.pool.waiting} waiting`,
    ],
    ['Process Uptime', `${report.uptimeFormatted} (Node ${report.runtime.nodeVersion})`],
    [
      'Memory Usage',
      `${report.runtime.memoryRssMb.toFixed(1)} MB RSS | ${report.runtime.heapUsedMb.toFixed(1)} MB Heap`,
    ],
  ];

  leftRows.forEach(([k, v], i) => {
    const ry = y + 30 + i * 13;
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(k, marginX + 10, ry);
    doc.setTextColor(...INK);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(toPdfSafeAscii(v), marginX + halfW - 10, ry, { align: 'right' });
  });

  // Right card: Thresholds & Alert Channel Toggles
  const rightX = marginX + halfW + colGap;
  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(rightX, y, halfW, diagBoxH, 'FD');

  doc.setTextColor(...INK);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text('ALERT THRESHOLDS & CHANNELS', rightX + 10, y + 15);

  const rightRows: Array<[string, string, [number, number, number]]> = [
    [
      'Warning Alert Threshold',
      `${report.thresholds.alertThresholdMs} ms`,
      AMBER,
    ],
    [
      'Critical Latency Threshold',
      `${report.thresholds.criticalThresholdMs} ms`,
      PURPLE,
    ],
    ...HEALTH_ALERT_CHANNELS.map((ch): [string, string, [number, number, number]] => {
      const enabled = report.alertPreferences[ch.key];
      return [ch.label, enabled ? 'ENABLED' : 'MUTED', enabled ? GREEN : MUTED];
    }),
  ];

  rightRows.forEach(([k, v, color], i) => {
    const ry = y + 30 + i * 13;
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(k, rightX + 10, ry);
    doc.setTextColor(...color);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(v, rightX + halfW - 10, ry, { align: 'right' });
  });

  y += diagBoxH + 18;

  // ── 6. RECENT CONNECTION ATTEMPT LOGS (LAST 5) ────────────────────────────
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Recent Cloud SQL Connection Attempts (Last 5)', marginX, y);
  y += 8;

  const logRows = report.recentConnectionLogs;
  const tableHeaderH = 18;
  const tableRowH = 17;
  const tableH = tableHeaderH + Math.max(1, logRows.length) * tableRowH + 4;

  doc.setFillColor(...CARD_BG);
  doc.setDrawColor(...BORDER);
  doc.rect(marginX, y, contentWidth, tableH, 'FD');

  // Header strip
  doc.setFillColor(...PARCHMENT);
  doc.rect(marginX + 0.5, y + 0.5, contentWidth - 1, tableHeaderH, 'F');

  const colAttempt = marginX + 8;
  const colTime = marginX + 52;
  const colStatus = marginX + 148;
  const colLatency = marginX + 236;
  const colOutput = marginX + 292;

  doc.setTextColor(...MUTED);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.2);
  doc.text('ATTEMPT', colAttempt, y + 12);
  doc.text('TIMESTAMP (UTC)', colTime, y + 12);
  doc.text('STATUS', colStatus, y + 12);
  doc.text('LATENCY', colLatency, y + 12);
  doc.text('DIAGNOSTIC OUTPUT', colOutput, y + 12);

  if (logRows.length === 0) {
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      'No connection attempts recorded in current session.',
      marginX + 10,
      y + tableHeaderH + 13,
    );
  } else {
    logRows.forEach((entry, idx) => {
      const ry = y + tableHeaderH + idx * tableRowH + 12;
      if (idx > 0) {
        doc.setDrawColor(236, 234, 228);
        doc.setLineWidth(0.5);
        doc.line(marginX + 4, ry - 11, pageWidth - marginX - 4, ry - 11);
      }

      const connected = entry.databaseStatus === 'connected';
      const isCrit =
        connected &&
        entry.latencyMs !== null &&
        Math.round(entry.latencyMs) > report.thresholds.criticalThresholdMs;
      const isWarn =
        connected &&
        entry.latencyMs !== null &&
        Math.round(entry.latencyMs) > report.thresholds.alertThresholdMs;

      doc.setTextColor(...INK);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.text(
        `#${String(entry.sequenceNumber).padStart(2, '0')}`,
        colAttempt,
        ry,
      );

      doc.setFont('courier', 'normal');
      doc.text(formatUtcClock(entry.checkedAt), colTime, ry);

      const statusColor = !connected
        ? RED
        : isCrit
          ? PURPLE
          : isWarn
            ? AMBER
            : GREEN;
      doc.setTextColor(...statusColor);
      doc.setFont('courier', 'bold');
      doc.text(
        !connected
          ? 'Disconnected'
          : isCrit
            ? 'Critical'
            : isWarn
              ? 'Slow'
              : 'Connected',
        colStatus,
        ry,
      );

      doc.setTextColor(...INK);
      doc.setFont('courier', 'normal');
      doc.text(toPdfSafeAscii(formatLatencyMs(entry.latencyMs)), colLatency, ry);

      doc.setTextColor(...MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      const trimmedMsg =
        entry.message.length > 48
          ? `${entry.message.slice(0, 45)}...`
          : entry.message;
      doc.text(toPdfSafeAscii(trimmedMsg), colOutput, ry);
    });
  }

  // ── 7. FOOTER (ALL PAGES) ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.6);
    doc.line(marginX, pageHeight - 36, pageWidth - marginX, pageHeight - 36);

    doc.setTextColor(...MUTED);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.2);
    doc.text(
      `Generated ${formatUtcStamp(report.generatedAtIso)} | Sport Castle Operations | /api/system-health/report.pdf`,
      marginX,
      pageHeight - 22,
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 22, {
      align: 'right',
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

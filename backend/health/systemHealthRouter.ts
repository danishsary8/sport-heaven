import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getSystemHealthMetricsSnapshot,
  getSystemHealthSnapshot,
  type DatabaseProbeFn,
} from './systemHealthService.ts';
import {
  buildConnectionLogsCsv,
  buildConnectionLogsCsvFilename,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  DEFAULT_METRICS_LIMIT,
  formatLatencyMs,
  getRecentConnectionAttemptLogs,
  sanitizeCriticalLatencyThresholdMs,
  sanitizeLatencyThresholdMs,
  sanitizeMetricsLimit,
  type SystemHealthSnapshot,
} from './systemHealthTypes.ts';
import {
  buildSystemHealthPdfFilename,
  generateSystemHealthPdfBytes,
} from './systemHealthPdfReport.ts';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUtcTimestamp(iso: string): string {
  return iso.length >= 19 ? `${iso.slice(0, 19).replace('T', ' ')} UTC` : iso;
}

export function renderSystemHealthHtml(snapshot: SystemHealthSnapshot): string {
  const isHealthy = snapshot.overallStatus === 'operational';
  const statusLabel = isHealthy ? 'Operational' : 'Degraded';
  const dbLabel =
    snapshot.database.status === 'connected' ? 'Connected' : 'Disconnected';
  const statusAccent = isHealthy ? '#16A34A' : '#DC2626';

  const barsHtml = snapshot.recentChecks
    .map((sample) => {
      const barColor =
        sample.databaseStatus === 'connected' ? '#16A34A' : '#DC2626';
      const title = escapeHtml(
        `${sample.checkedAt} · ${sample.databaseStatus} · ${formatLatencyMs(sample.latencyMs)}`,
      );
      return `<span class="bar" style="background:${barColor}" title="${title}"></span>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Health · Sport Castle Backend</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #F4F2EC;
      color: #0E1113;
      line-height: 1.5;
      padding: 32px 20px;
    }
    .shell { max-width: 960px; margin: 0 auto; }
    .header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(14, 17, 19, 0.14);
    }
    .kicker {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #5A5D57;
    }
    h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin-top: 6px; }
    .actions { display: flex; gap: 10px; align-items: center; }
    .btn {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 10px 16px;
      border: 1px solid #0E1113;
      background: #0E1113;
      color: #FDFCF9;
      cursor: pointer;
      text-decoration: none;
    }
    .btn.secondary { background: #FDFCF9; color: #0E1113; border-color: rgba(14, 17, 19, 0.25); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1px;
      background: rgba(14, 17, 19, 0.12);
      border: 1px solid rgba(14, 17, 19, 0.14);
      margin-top: 24px;
    }
    .metric { background: #FDFCF9; padding: 20px; }
    .metric-label {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5A5D57;
    }
    .metric-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-variant-numeric: tabular-nums;
      font-size: 24px;
      font-weight: 700;
      margin-top: 8px;
    }
    .metric-sub { font-size: 12px; color: #5A5D57; margin-top: 4px; }
    .panel {
      margin-top: 24px;
      background: #FDFCF9;
      border: 1px solid rgba(14, 17, 19, 0.14);
      padding: 20px;
    }
    .panel-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td {
      text-align: left;
      padding: 10px 8px;
      border-bottom: 1px solid rgba(14, 17, 19, 0.08);
    }
    th {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #5A5D57;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
    .bars { display: flex; gap: 4px; align-items: flex-end; height: 32px; margin-top: 12px; }
    .bar { flex: 1; max-width: 24px; height: 28px; display: inline-block; }
  </style>
</head>
<body>
  <main class="shell">
    <header class="header">
      <div>
        <p class="kicker">Sport Castle · Backend Monitoring</p>
        <h1>System Health</h1>
      </div>
      <div class="actions">
        <a class="btn secondary" href="/api/system-health/report.pdf">24h PDF Report</a>
        <a class="btn secondary" href="/api/system-health/logs.csv">Export Logs CSV</a>
        <a class="btn secondary" href="/#/system-health">Open Full Dashboard</a>
        <a class="btn" href="/api/system-health/view">Run Live Check</a>
      </div>
    </header>

    <section class="grid" aria-label="Service health metrics">
      <div class="metric">
        <p class="metric-label">Overall Status</p>
        <p class="metric-value" style="color:${statusAccent}">${escapeHtml(statusLabel)}</p>
        <p class="metric-sub mono">${escapeHtml(snapshot.service)}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Cloud SQL Instance</p>
        <p class="metric-value" style="color:${statusAccent}">${escapeHtml(dbLabel)}</p>
        <p class="metric-sub mono">Latency: ${escapeHtml(formatLatencyMs(snapshot.database.latencyMs))}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Service Uptime</p>
        <p class="metric-value">${escapeHtml(snapshot.uptimeFormatted)}</p>
        <p class="metric-sub mono">Started ${escapeHtml(formatUtcTimestamp(snapshot.startedAt))}</p>
      </div>
      <div class="metric">
        <p class="metric-label">Observed Availability</p>
        <p class="metric-value">${escapeHtml(snapshot.availabilityPercent.toFixed(1))}%</p>
        <p class="metric-sub mono">${snapshot.recentChecks.length} probe(s) recorded</p>
      </div>
    </section>

    <section class="panel" aria-label="Service checks">
      <div class="panel-title">
        <span>Component Diagnostics</span>
        <span class="kicker mono">Checked ${escapeHtml(formatUtcTimestamp(snapshot.checkedAt))}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Latency / Pool</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${escapeHtml(snapshot.database.engine)}</strong></td>
            <td class="mono" style="color:${statusAccent}">${escapeHtml(dbLabel)}</td>
            <td class="mono">${escapeHtml(formatLatencyMs(snapshot.database.latencyMs))} · Pool ${snapshot.database.pool.total}/${snapshot.database.pool.idle} idle</td>
            <td>${escapeHtml(snapshot.database.message)}</td>
          </tr>
          <tr>
            <td><strong>Express API Runtime</strong></td>
            <td class="mono" style="color:#16A34A">Operational</td>
            <td class="mono">${escapeHtml(snapshot.runtime.nodeVersion)} · ${snapshot.runtime.memoryRssMb} MB RSS</td>
            <td>Serving storefront API routes on port 3000.</td>
          </tr>
        </tbody>
      </table>
      <div class="bars" aria-label="Recent probe timeline">${barsHtml}</div>
    </section>
  </main>
</body>
</html>`;
}

export function createSystemHealthRouter(options?: {
  probeDatabase?: DatabaseProbeFn;
}): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const snapshot = await getSystemHealthSnapshot({
        probeDatabase: options?.probeDatabase,
      });
      res.setHeader('Cache-Control', 'no-store');
      res
        .status(snapshot.overallStatus === 'operational' ? 200 : 503)
        .json(snapshot);
    } catch (error) {
      console.error('[SystemHealth] Unexpected health endpoint error:', error);
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        service: 'sport-castle-backend',
        overallStatus: 'degraded',
        error: 'Unable to complete system health check.',
      });
    }
  });

  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const limitParam =
        typeof req.query.limit === 'string' ? req.query.limit : undefined;
      const thresholdParam =
        typeof req.query.thresholdMs === 'string'
          ? req.query.thresholdMs
          : undefined;
      const probeParam =
        typeof req.query.probe === 'string'
          ? req.query.probe.trim().toLowerCase()
          : undefined;

      const limit = sanitizeMetricsLimit(limitParam, DEFAULT_METRICS_LIMIT);
      const thresholdMs = sanitizeLatencyThresholdMs(
        thresholdParam,
        DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
      );
      const probe = probeParam !== 'false' && probeParam !== '0';

      const metrics = await getSystemHealthMetricsSnapshot({
        probeDatabase: options?.probeDatabase,
        limit,
        thresholdMs,
        probe,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(metrics);
    } catch (error) {
      console.error('[SystemHealth] Unexpected metrics endpoint error:', error);
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        service: 'sport-castle-backend',
        overallStatus: 'degraded',
        error: 'Unable to load system health metrics.',
      });
    }
  });

  router.get('/logs.csv', async (req: Request, res: Response) => {
    try {
      const thresholdParam =
        typeof req.query.thresholdMs === 'string'
          ? req.query.thresholdMs
          : undefined;
      const thresholdMs = sanitizeLatencyThresholdMs(
        thresholdParam,
        DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
      );
      const snapshot = await getSystemHealthSnapshot({
        probeDatabase: options?.probeDatabase,
      });
      const lastFiveLogs = getRecentConnectionAttemptLogs(snapshot.recentChecks, 5);
      const csvContent = buildConnectionLogsCsv(lastFiveLogs, thresholdMs);
      const filename = buildConnectionLogsCsvFilename(new Date());

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(`\uFEFF${csvContent}`);
    } catch (error) {
      console.error('[SystemHealth] Unexpected CSV export error:', error);
      res.status(503).type('text/plain').send('Connection logs CSV export unavailable.');
    }
  });

  router.get('/report.pdf', async (req: Request, res: Response) => {
    try {
      const thresholdParam =
        typeof req.query.thresholdMs === 'string'
          ? req.query.thresholdMs
          : undefined;
      const criticalParam =
        typeof req.query.criticalThresholdMs === 'string'
          ? req.query.criticalThresholdMs
          : undefined;

      const alertThresholdMs = sanitizeLatencyThresholdMs(
        thresholdParam,
        DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
      );
      const criticalThresholdMs = sanitizeCriticalLatencyThresholdMs(
        criticalParam,
        DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
      );

      const snapshot = await getSystemHealthSnapshot({
        probeDatabase: options?.probeDatabase,
      });
      const generatedAt = new Date();
      const pdfBytes = generateSystemHealthPdfBytes(snapshot, {
        alertThresholdMs,
        criticalThresholdMs,
        generatedAt,
      });
      const filename = buildSystemHealthPdfFilename(generatedAt);

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(pdfBytes.byteLength));
      res.status(200).send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('[SystemHealth] Unexpected PDF report export error:', error);
      res.status(503).type('text/plain').send('24-hour system health PDF report unavailable.');
    }
  });

  router.get('/view', async (_req: Request, res: Response) => {
    try {
      const snapshot = await getSystemHealthSnapshot({
        probeDatabase: options?.probeDatabase,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res
        .status(snapshot.overallStatus === 'operational' ? 200 : 503)
        .send(renderSystemHealthHtml(snapshot));
    } catch (error) {
      console.error('[SystemHealth] Unexpected HTML view error:', error);
      res.status(503).type('text/plain').send('System health view unavailable.');
    }
  });

  return router;
}

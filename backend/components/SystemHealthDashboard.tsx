import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Radio,
  RefreshCw,
  Server,
  SlidersHorizontal,
  Terminal,
  X,
} from 'lucide-react';
import {
  buildConnectionLogsCsv,
  buildConnectionLogsCsvFilename,
  countCriticalLatencyPoints,
  countEnabledAlertPreferences,
  countLatencyThresholdBreaches,
  DEFAULT_ANOMALY_STD_MULTIPLIER,
  DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
  DEFAULT_HEALTH_ALERT_PREFERENCES,
  DEFAULT_LATENCY_ALERT_THRESHOLD_MS,
  evaluateLatencyAlert,
  evaluateSystemHealthAlerts,
  formatLatencyMs,
  getRecentConnectionAttemptLogs,
  HEALTH_ALERT_CHANNELS,
  LATENCY_THRESHOLD_PRESETS_MS,
  MAX_CRITICAL_LATENCY_THRESHOLD_MS,
  MAX_LATENCY_ALERT_THRESHOLD_MS,
  MIN_CRITICAL_LATENCY_THRESHOLD_MS,
  MIN_LATENCY_ALERT_THRESHOLD_MS,
  sanitizeCriticalLatencyThresholdMs,
  sanitizeHealthAlertPreferences,
  sanitizeLatencyThresholdMs,
  type HealthCheckSample,
  type SystemHealthAlertPreferences,
  type SystemHealthAlertType,
  type SystemHealthMetricsResponse,
  type SystemHealthSnapshot,
} from '../health/systemHealthTypes';
import { DatabaseLatencyChart } from '../../src/components/admin/DatabaseLatencyChart';
import { HourlyAverageLatencyChart } from '../../src/components/admin/HourlyAverageLatencyChart';
import { LatencyHistogramChart } from '../../src/components/admin/LatencyHistogramChart';
import { SystemUptimeChart } from '../../src/components/admin/SystemUptimeChart';
import {
  buildSystemHealthPdfFilename,
  generateSystemHealthPdfBytes,
} from '../health/systemHealthPdfReport';

const LATENCY_THRESHOLD_STORAGE_KEY = 'sport-castle:health-latency-threshold-ms';
const CRITICAL_LATENCY_THRESHOLD_STORAGE_KEY =
  'sport-castle:health-critical-latency-threshold-ms';
const LATENCY_TOAST_ALERTS_STORAGE_KEY =
  'sport-castle:health-latency-toast-alerts';
const HEALTH_ALERT_PREFERENCES_STORAGE_KEY =
  'sport-castle:health-alert-preferences';
const LIVE_MODE_INTERVAL_MS = 5_000;

interface LatencyToastNotification {
  id: string;
  alertType: SystemHealthAlertType;
  title: string;
  message: string;
  latencyMs?: number;
  thresholdMs?: number;
  excessMs?: number;
  badgeText?: string;
  checkedAt: string;
}

function readStoredLatencyThreshold(): number {
  if (typeof window === 'undefined') return DEFAULT_LATENCY_ALERT_THRESHOLD_MS;
  try {
    const raw = window.localStorage.getItem(LATENCY_THRESHOLD_STORAGE_KEY);
    return sanitizeLatencyThresholdMs(raw, DEFAULT_LATENCY_ALERT_THRESHOLD_MS);
  } catch {
    return DEFAULT_LATENCY_ALERT_THRESHOLD_MS;
  }
}

function readStoredCriticalLatencyThreshold(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS;
  }
  try {
    const raw = window.localStorage.getItem(
      CRITICAL_LATENCY_THRESHOLD_STORAGE_KEY,
    );
    return sanitizeCriticalLatencyThresholdMs(
      raw,
      DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
    );
  } catch {
    return DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS;
  }
}

function readStoredToastAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(LATENCY_TOAST_ALERTS_STORAGE_KEY);
    return raw !== 'false';
  } catch {
    return true;
  }
}

function readStoredAlertPreferences(): SystemHealthAlertPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_HEALTH_ALERT_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(
      HEALTH_ALERT_PREFERENCES_STORAGE_KEY,
    );
    if (!raw) return { ...DEFAULT_HEALTH_ALERT_PREFERENCES };
    return sanitizeHealthAlertPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_HEALTH_ALERT_PREFERENCES };
  }
}

interface SystemHealthDashboardProps {
  endpointUrl?: string;
  onBackToStore?: () => void;
}

function formatIsoClock(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatIsoDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function SystemHealthDashboard({
  endpointUrl = '/api/system-health',
  onBackToStore,
}: SystemHealthDashboardProps) {
  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);
  const [fallbackAttempts, setFallbackAttempts] = useState<HealthCheckSample[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [latencyThresholdMs, setLatencyThresholdMs] = useState<number>(() =>
    readStoredLatencyThreshold(),
  );
  const [thresholdInput, setThresholdInput] = useState<string>(() =>
    String(readStoredLatencyThreshold()),
  );
  const [thresholdValidationError, setThresholdValidationError] = useState<
    string | null
  >(null);
  const [criticalLatencyThresholdMs, setCriticalLatencyThresholdMs] =
    useState<number>(() => readStoredCriticalLatencyThreshold());
  const [criticalThresholdInput, setCriticalThresholdInput] = useState<string>(
    () => String(readStoredCriticalLatencyThreshold()),
  );
  const [
    criticalThresholdValidationError,
    setCriticalThresholdValidationError,
  ] = useState<string | null>(null);
  const [toastAlertsEnabled, setToastAlertsEnabled] = useState<boolean>(() =>
    readStoredToastAlertsEnabled(),
  );
  const [alertPreferences, setAlertPreferences] =
    useState<SystemHealthAlertPreferences>(() => readStoredAlertPreferences());
  const [latencyToasts, setLatencyToasts] = useState<
    LatencyToastNotification[]
  >([]);
  const [anomalyDetectionEnabled, setAnomalyDetectionEnabled] =
    useState<boolean>(false);
  const [anomalySigma, setAnomalySigma] = useState<number>(
    DEFAULT_ANOMALY_STD_MULTIPLIER,
  );
  const [metricsRefreshSignal, setMetricsRefreshSignal] = useState<number>(0);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [pdfExportFeedback, setPdfExportFeedback] = useState<string | null>(
    null,
  );

  const isProbeInFlightRef = useRef<boolean>(false);
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastEmittedRef = useRef<{
    thresholdMs: number;
    emittedAt: number;
  } | null>(null);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const exportFeedbackTimerRef = useRef<number | null>(null);
  const pdfFeedbackTimerRef = useRef<number | null>(null);

  const dismissLatencyToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setLatencyToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Clean up all pending toast and export feedback timers on unmount
  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
      if (exportFeedbackTimerRef.current !== null) {
        window.clearTimeout(exportFeedbackTimerRef.current);
        exportFeedbackTimerRef.current = null;
      }
      if (pdfFeedbackTimerRef.current !== null) {
        window.clearTimeout(pdfFeedbackTimerRef.current);
        pdfFeedbackTimerRef.current = null;
      }
    };
  }, []);

  const triggerLatencyToastIfExceeded = useCallback(
    (
      latencyMs: number | null,
      databaseStatus: 'connected' | 'disconnected',
      checkedAt: string,
      thresholdMs: number,
    ) => {
      if (!toastAlertsEnabled || !alertPreferences.latency) return;
      const evaluation = evaluateLatencyAlert(
        latencyMs,
        thresholdMs,
        databaseStatus,
      );
      if (
        evaluation.severity !== 'high-latency' ||
        evaluation.latencyMs === null
      ) {
        return;
      }

      const now = Date.now();
      const dedupeKey = `${checkedAt}:${evaluation.thresholdMs}`;
      if (lastToastKeyRef.current === dedupeKey) {
        return;
      }
      if (
        lastToastEmittedRef.current &&
        lastToastEmittedRef.current.thresholdMs === evaluation.thresholdMs &&
        now - lastToastEmittedRef.current.emittedAt < 2500
      ) {
        return;
      }
      lastToastKeyRef.current = dedupeKey;
      lastToastEmittedRef.current = {
        thresholdMs: evaluation.thresholdMs,
        emittedAt: now,
      };

      const id = `latency-toast-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const toastItem: LatencyToastNotification = {
        id,
        alertType: 'latency',
        title: `Latency Exceeded ${evaluation.thresholdMs} ms`,
        message: evaluation.summaryMessage,
        latencyMs: evaluation.latencyMs,
        thresholdMs: evaluation.thresholdMs,
        excessMs: evaluation.excessMs,
        checkedAt,
      };

      setLatencyToasts((prev) => [toastItem, ...prev].slice(0, 3));
      const timerId = window.setTimeout(() => {
        toastTimersRef.current.delete(id);
        setLatencyToasts((prev) => prev.filter((item) => item.id !== id));
      }, 6500);
      toastTimersRef.current.set(id, timerId);
    },
    [toastAlertsEnabled, alertPreferences.latency],
  );

  const persistAlertPreferences = useCallback(
    (nextPrefs: SystemHealthAlertPreferences) => {
      const sanitized = sanitizeHealthAlertPreferences(nextPrefs);
      setAlertPreferences(sanitized);
      try {
        window.localStorage.setItem(
          HEALTH_ALERT_PREFERENCES_STORAGE_KEY,
          JSON.stringify(sanitized),
        );
      } catch {
        // Ignore storage errors
      }
    },
    [],
  );

  const toggleAlertPreference = useCallback(
    (alertType: SystemHealthAlertType) => {
      setAlertPreferences((prev) => {
        const nextEnabled = !prev[alertType];
        const next: SystemHealthAlertPreferences = {
          ...prev,
          [alertType]: nextEnabled,
        };
        try {
          window.localStorage.setItem(
            HEALTH_ALERT_PREFERENCES_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch {
          // Ignore storage errors
        }
        if (!nextEnabled) {
          // Immediately dismiss any active toasts belonging to the disabled alert type
          setLatencyToasts((currentToasts) => {
            currentToasts.forEach((toast) => {
              if (toast.alertType === alertType) {
                const timer = toastTimersRef.current.get(toast.id);
                if (timer !== undefined) {
                  window.clearTimeout(timer);
                  toastTimersRef.current.delete(toast.id);
                }
              }
            });
            return currentToasts.filter((toast) => toast.alertType !== alertType);
          });
        } else if (alertType === 'latency') {
          lastToastKeyRef.current = null;
          lastToastEmittedRef.current = null;
        }
        return next;
      });
    },
    [],
  );

  const setAllAlertPreferences = useCallback(
    (enabled: boolean) => {
      const next: SystemHealthAlertPreferences = {
        latency: enabled,
        downtime: enabled,
        connectionFailure: enabled,
      };
      persistAlertPreferences(next);
      if (!enabled) {
        toastTimersRef.current.forEach((timerId) =>
          window.clearTimeout(timerId),
        );
        toastTimersRef.current.clear();
        setLatencyToasts([]);
      } else {
        lastToastKeyRef.current = null;
        lastToastEmittedRef.current = null;
      }
    },
    [persistAlertPreferences],
  );

  const toggleToastAlerts = useCallback(() => {
    setToastAlertsEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          LATENCY_TOAST_ALERTS_STORAGE_KEY,
          String(next),
        );
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const persistLatencyThreshold = useCallback((nextMs: number) => {
    const sanitized = sanitizeLatencyThresholdMs(nextMs);
    setLatencyThresholdMs(sanitized);
    setThresholdInput(String(sanitized));
    setThresholdValidationError(null);
    try {
      window.localStorage.setItem(LATENCY_THRESHOLD_STORAGE_KEY, String(sanitized));
    } catch {
      // Ignore storage quota / privacy mode failures
    }
  }, []);

  const handleThresholdSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = thresholdInput.trim();
    if (!trimmed) {
      setThresholdValidationError(
        `Enter a threshold between ${MIN_LATENCY_ALERT_THRESHOLD_MS} and ${MAX_LATENCY_ALERT_THRESHOLD_MS} ms.`,
      );
      return;
    }
    const parsed = Number(trimmed);
    if (
      !Number.isFinite(parsed) ||
      parsed < MIN_LATENCY_ALERT_THRESHOLD_MS ||
      parsed > MAX_LATENCY_ALERT_THRESHOLD_MS
    ) {
      setThresholdValidationError(
        `Threshold must be between ${MIN_LATENCY_ALERT_THRESHOLD_MS} ms and ${MAX_LATENCY_ALERT_THRESHOLD_MS.toLocaleString()} ms.`,
      );
      return;
    }
    persistLatencyThreshold(parsed);
  };

  const persistCriticalLatencyThreshold = useCallback(
    (nextMs: number, syncInput = true) => {
      const sanitized = sanitizeCriticalLatencyThresholdMs(nextMs);
      setCriticalLatencyThresholdMs(sanitized);
      if (syncInput) {
        setCriticalThresholdInput(String(sanitized));
      }
      setCriticalThresholdValidationError(null);
      try {
        window.localStorage.setItem(
          CRITICAL_LATENCY_THRESHOLD_STORAGE_KEY,
          String(sanitized),
        );
      } catch {
        // Ignore storage quota / privacy mode failures
      }
    },
    [],
  );

  const handleCriticalThresholdInputChange = (rawValue: string) => {
    setCriticalThresholdInput(rawValue);
    if (criticalThresholdValidationError) {
      setCriticalThresholdValidationError(null);
    }
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const parsed = Number(trimmed);
    if (
      Number.isFinite(parsed) &&
      parsed >= MIN_CRITICAL_LATENCY_THRESHOLD_MS &&
      parsed <= MAX_CRITICAL_LATENCY_THRESHOLD_MS
    ) {
      persistCriticalLatencyThreshold(parsed, false);
    }
  };

  const handleCriticalThresholdSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = criticalThresholdInput.trim();
    if (!trimmed) {
      setCriticalThresholdValidationError(
        `Enter a Critical Latency value between ${MIN_CRITICAL_LATENCY_THRESHOLD_MS} and ${MAX_CRITICAL_LATENCY_THRESHOLD_MS.toLocaleString()} ms.`,
      );
      return;
    }
    const parsed = Number(trimmed);
    if (
      !Number.isFinite(parsed) ||
      parsed < MIN_CRITICAL_LATENCY_THRESHOLD_MS ||
      parsed > MAX_CRITICAL_LATENCY_THRESHOLD_MS
    ) {
      setCriticalThresholdValidationError(
        `Critical Latency must be between ${MIN_CRITICAL_LATENCY_THRESHOLD_MS} ms and ${MAX_CRITICAL_LATENCY_THRESHOLD_MS.toLocaleString()} ms.`,
      );
      return;
    }
    persistCriticalLatencyThreshold(parsed, true);
  };

  const recordClientFailure = useCallback((reason: string) => {
    const failedSample: HealthCheckSample = {
      checkedAt: new Date().toISOString(),
      status: 'offline',
      databaseStatus: 'disconnected',
      latencyMs: null,
      message: reason,
    };
    setFallbackAttempts((prev) => [...prev, failedSample].slice(-5));
  }, []);

  const runHealthCheck = useCallback(
    async (isManual = false) => {
      if (isProbeInFlightRef.current) return;
      isProbeInFlightRef.current = true;

      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading((prev) => (snapshot ? prev : true));
      }
      setErrorMessage(null);

      try {
        const response = await fetch(endpointUrl, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        const payload = (await response.json()) as Partial<SystemHealthSnapshot> & {
          error?: string;
        };

        if (payload && payload.database && payload.runtime) {
          setSnapshot(payload as SystemHealthSnapshot);
          setFallbackAttempts([]);
          setMetricsRefreshSignal((prev) => prev + 1);
        } else {
          const reason =
            payload?.error || `Health check returned status ${response.status}.`;
          setErrorMessage(reason);
          recordClientFailure(reason);
        }
      } catch {
        const reason =
          'Unable to reach the backend health endpoint. Verify the server is running.';
        setErrorMessage(reason);
        recordClientFailure(reason);
      } finally {
        isProbeInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endpointUrl, snapshot, recordClientFailure],
  );

  useEffect(() => {
    void runHealthCheck(false);
    // Run initial live check once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointUrl]);

  // Cleanup-managed 5-second interval when Live Mode is active
  useEffect(() => {
    if (!liveMode) return;
    const intervalId = window.setInterval(() => {
      void runHealthCheck(true);
    }, LIVE_MODE_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [liveMode, runHealthCheck]);

  // Trigger a toast notification whenever current snapshot latency exceeds custom threshold
  useEffect(() => {
    if (!snapshot) return;
    triggerLatencyToastIfExceeded(
      snapshot.database.latencyMs,
      snapshot.database.status,
      snapshot.checkedAt,
      latencyThresholdMs,
    );
  }, [snapshot, latencyThresholdMs, triggerLatencyToastIfExceeded]);

  const handleMetricsLoaded = useCallback(
    (metrics: SystemHealthMetricsResponse) => {
      triggerLatencyToastIfExceeded(
        metrics.summary.currentMs,
        metrics.databaseStatus,
        metrics.checkedAt,
        latencyThresholdMs,
      );
    },
    [latencyThresholdMs, triggerLatencyToastIfExceeded],
  );

  const isOperational = snapshot?.overallStatus === 'operational';
  const isDbConnected = snapshot?.database.status === 'connected';
  const latencyAlert = snapshot
    ? evaluateLatencyAlert(
        snapshot.database.latencyMs,
        latencyThresholdMs,
        snapshot.database.status,
      )
    : null;
  const recentThresholdBreaches = snapshot
    ? countLatencyThresholdBreaches(snapshot.recentChecks, latencyThresholdMs)
    : 0;
  const recentCriticalCount = snapshot
    ? countCriticalLatencyPoints(
        snapshot.recentChecks.map((check) =>
          check.databaseStatus === 'connected' ? check.latencyMs : null,
        ),
        criticalLatencyThresholdMs,
      )
    : 0;
  const enabledAlertCount = countEnabledAlertPreferences(alertPreferences);
  const { activeAlerts, suppressedTypes } = evaluateSystemHealthAlerts(
    {
      overallStatus: snapshot?.overallStatus,
      databaseStatus: snapshot?.database.status,
      latencyMs: snapshot?.database.latencyMs,
      latencyThresholdMs,
      availabilityPercent: snapshot?.availabilityPercent,
      endpointError: errorMessage,
    },
    alertPreferences,
  );
  const downtimeAlert = activeAlerts.find((a) => a.type === 'downtime') ?? null;
  const connectionFailureAlert =
    activeAlerts.find((a) => a.type === 'connectionFailure') ?? null;
  const chronologicalConnectionLogs = getRecentConnectionAttemptLogs(
    snapshot
      ? [...snapshot.recentChecks, ...fallbackAttempts]
      : fallbackAttempts,
    5,
  );

  const handleExportConnectionLogsCsv = useCallback(() => {
    if (chronologicalConnectionLogs.length === 0) return;

    const csvContent = buildConnectionLogsCsv(
      chronologicalConnectionLogs,
      latencyThresholdMs,
    );
    const filename = buildConnectionLogsCsvFilename(new Date());
    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const objectUrl = window.URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportFeedback(
        `Exported ${chronologicalConnectionLogs.length} log${chronologicalConnectionLogs.length === 1 ? '' : 's'}`,
      );
      if (exportFeedbackTimerRef.current !== null) {
        window.clearTimeout(exportFeedbackTimerRef.current);
      }
      exportFeedbackTimerRef.current = window.setTimeout(() => {
        exportFeedbackTimerRef.current = null;
        setExportFeedback(null);
      }, 3000);
    } finally {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    }
  }, [chronologicalConnectionLogs, latencyThresholdMs]);

  const handleExport24hPdfReport = useCallback(() => {
    if (!snapshot) return;

    const generatedAt = new Date();
    const pdfBytes = generateSystemHealthPdfBytes(snapshot, {
      alertThresholdMs: latencyThresholdMs,
      criticalThresholdMs: criticalLatencyThresholdMs,
      alertPreferences,
      generatedAt,
    });
    const filename = buildSystemHealthPdfFilename(generatedAt);
    const pdfBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const objectUrl = window.URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setPdfExportFeedback('24h PDF Saved');
      if (pdfFeedbackTimerRef.current !== null) {
        window.clearTimeout(pdfFeedbackTimerRef.current);
      }
      pdfFeedbackTimerRef.current = window.setTimeout(() => {
        pdfFeedbackTimerRef.current = null;
        setPdfExportFeedback(null);
      }, 3000);
    } finally {
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    }
  }, [
    snapshot,
    latencyThresholdMs,
    criticalLatencyThresholdMs,
    alertPreferences,
  ]);

  return (
    <div className="min-h-[82vh] bg-[#F4F2EC] py-10 sm:py-14">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">
        {/* Top Header */}
        <header className="flex flex-col gap-5 border-b border-[#0E1113]/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5A5D57]">
              {onBackToStore && (
                <>
                  <button
                    type="button"
                    onClick={onBackToStore}
                    className="inline-flex items-center gap-1.5 font-medium text-[#0E1113] transition-colors hover:text-[#C8232C] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Storefront</span>
                  </button>
                  <span aria-hidden="true">/</span>
                </>
              )}
              <span className="whitespace-nowrap">Backend Operations</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden font-mono sm:inline whitespace-nowrap">
                GET {endpointUrl}
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-[#0E1113] sm:text-5xl text-balance">
              System Health
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#5A5D57]">
              Live connectivity diagnostics for the Cloud SQL PostgreSQL instance and
              Express API service uptime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExport24hPdfReport}
              disabled={!snapshot}
              data-testid="header-export-pdf"
              aria-label="Generate 24-hour system health summary PDF report"
              title="Download a 24-hour summary PDF report of system health metrics"
              className={`inline-flex h-10 items-center gap-2 border px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0 ${
                pdfExportFeedback
                  ? 'border-[#16A34A] bg-[#16A34A]/10 text-[#15803D]'
                  : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9]'
              }`}
            >
              {pdfExportFeedback ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{pdfExportFeedback ?? 'Export 24h PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportConnectionLogsCsv}
              disabled={chronologicalConnectionLogs.length === 0}
              data-testid="header-export-csv"
              aria-label="Export last 5 connection attempt logs as CSV"
              title="Download last 5 Cloud SQL connection attempt logs as CSV"
              className={`inline-flex h-10 items-center gap-2 border px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0 ${
                exportFeedback
                  ? 'border-[#16A34A] bg-[#16A34A]/10 text-[#15803D]'
                  : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9]'
              }`}
            >
              {exportFeedback ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Download className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{exportFeedback ?? 'Export Logs CSV'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLiveMode((prev) => !prev)}
              aria-pressed={liveMode}
              data-testid="live-mode-toggle"
              className={`inline-flex h-10 items-center gap-2 border px-4 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                liveMode
                  ? 'border-[#16A34A] bg-[#16A34A] text-[#FDFCF9]'
                  : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113]'
              }`}
            >
              <Radio
                className={`h-3.5 w-3.5 ${liveMode ? 'animate-pulse' : ''}`}
              />
              <span>{liveMode ? 'Live Mode: On (5s)' : 'Live Mode: Off'}</span>
            </button>
            <button
              type="button"
              onClick={() => void runHealthCheck(true)}
              disabled={refreshing || loading}
              className="inline-flex h-10 items-center gap-2 bg-[#0E1113] px-4 text-xs font-semibold text-[#FDFCF9] transition-colors hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span>{refreshing ? 'Checking...' : 'Run Live Check'}</span>
            </button>
          </div>
        </header>

        {/* Error State (gated by Connection Failure alert toggle) */}
        {errorMessage && alertPreferences.connectionFailure && (
          <div
            role="alert"
            data-testid="connection-failure-alert-banner"
            className="mt-6 flex flex-col gap-3 border border-[#DC2626]/35 bg-[#FEF2F2] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
              <div>
                <p className="text-sm font-semibold text-[#991B1B]">
                  Health Check Unavailable
                </p>
                <p className="mt-0.5 text-xs text-[#7F1D1D]">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void runHealthCheck(true)}
              className="inline-flex h-9 items-center justify-center border border-[#991B1B]/30 bg-white px-4 text-xs font-semibold text-[#991B1B] hover:border-[#991B1B] cursor-pointer whitespace-nowrap shrink-0"
            >
              Retry Check
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !snapshot ? (
          <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading system health">
            <div className="grid grid-cols-1 gap-px border border-[#0E1113]/15 bg-[#0E1113]/12 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="bg-[#FDFCF9] p-6">
                  <div className="h-3 w-24 bg-[#EAE7DF]" />
                  <div className="mt-3 h-7 w-32 bg-[#EAE7DF]" />
                  <div className="mt-2 h-3 w-36 bg-[#EAE7DF]/75" />
                </div>
              ))}
            </div>
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <div className="h-4 w-44 bg-[#EAE7DF]" />
              <div className="mt-4 space-y-3">
                <div className="h-10 w-full bg-[#F4F2EC]" />
                <div className="h-10 w-full bg-[#F4F2EC]" />
              </div>
            </div>
          </div>
        ) : snapshot ? (
          <div className="mt-8 space-y-8">
            {/* Connection Failure Alert Banner (when Cloud SQL disconnects & channel is enabled) */}
            {!errorMessage && connectionFailureAlert && (
              <div
                role="alert"
                data-testid="connection-failure-alert-banner"
                className="flex flex-col gap-3 border border-[#DC2626]/45 bg-[#FEF2F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#991B1B]">
                      {connectionFailureAlert.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7F1D1D]">
                      {connectionFailureAlert.message}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 self-start border border-[#DC2626]/45 bg-white px-3 py-1 font-mono text-[11px] font-bold text-[#991B1B] whitespace-nowrap sm:self-center">
                  {connectionFailureAlert.badgeText}
                </span>
              </div>
            )}

            {/* Downtime / SLA Availability Alert Banner (when enabled) */}
            {downtimeAlert && (
              <div
                role="alert"
                data-testid="downtime-alert-banner"
                className="flex flex-col gap-3 border border-[#DC2626]/40 bg-[#FEF2F2]/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#991B1B]">
                      {downtimeAlert.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7F1D1D]">
                      {downtimeAlert.message}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 self-start border border-[#DC2626]/40 bg-white px-3 py-1 font-mono text-[11px] font-bold text-[#991B1B] tabular-nums whitespace-nowrap sm:self-center">
                  {downtimeAlert.badgeText}
                </span>
              </div>
            )}

            {/* Automatic High-Latency Alert Banner when DB response exceeds threshold & Latency alerts enabled */}
            {alertPreferences.latency &&
              latencyAlert &&
              latencyAlert.severity === 'high-latency' && (
                <div
                  role="alert"
                  data-testid="latency-alert-banner"
                  className="flex flex-col gap-3 border border-[#D97706]/45 bg-[#FEF3C7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#92400E]">
                        Latency Threshold Exceeded
                      </p>
                      <p className="mt-0.5 text-xs text-[#78350F]">
                        {latencyAlert.summaryMessage}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 self-start border border-[#D97706] bg-[#FFFBEB] px-3 py-1 font-mono text-[11px] font-bold text-[#92400E] tabular-nums whitespace-nowrap sm:self-center">
                    +{latencyAlert.excessMs} ms over {latencyAlert.thresholdMs} ms
                  </span>
                </div>
              )}

            {/* Subtle notice when an active incident is silenced by admin alert channel toggles */}
            {suppressedTypes.length > 0 && (
              <div
                role="status"
                data-testid="muted-alerts-notice"
                className="flex flex-wrap items-center justify-between gap-2 border border-[#0E1113]/15 bg-[#F4F2EC] px-4 py-2.5 text-xs text-[#5A5D57]"
              >
                <div className="flex items-center gap-2">
                  <BellOff className="h-3.5 w-3.5 shrink-0 text-[#5A5D57]" />
                  <span>
                    {suppressedTypes.length} active alert
                    {suppressedTypes.length === 1 ? '' : 's'} muted by configuration (
                    {suppressedTypes
                      .map(
                        (t) =>
                          HEALTH_ALERT_CHANNELS.find((c) => c.key === t)
                            ?.shortLabel ?? t,
                      )
                      .join(', ')}
                    ).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllAlertPreferences(true)}
                  className="font-mono text-[11px] font-semibold text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C] cursor-pointer"
                >
                  Re-enable All Alerts
                </button>
              </div>
            )}

            {/* Primary 4-Column Metric Strip */}
            <section
              aria-label="Key health indicators"
              className="grid grid-cols-1 gap-px border border-[#0E1113]/15 bg-[#0E1113]/12 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="bg-[#FDFCF9] p-6">
                <p className="text-xs font-medium text-[#5A5D57]">Overall Service</p>
                <div className="mt-2.5 flex items-center gap-2">
                  {isOperational ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16A34A]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-[#DC2626]" />
                  )}
                  <span
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      isOperational ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {isOperational ? 'Operational' : 'Degraded'}
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-xs text-[#5A5D57] tabular-nums">
                  Checked {formatIsoClock(snapshot.checkedAt)}
                </p>
              </div>

              <div className="bg-[#FDFCF9] p-6">
                <p className="text-xs font-medium text-[#5A5D57]">
                  Cloud SQL Instance
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Database
                    className={`h-5 w-5 shrink-0 ${
                      !isDbConnected
                        ? 'text-[#DC2626]'
                        : latencyAlert?.severity === 'high-latency'
                          ? 'text-[#D97706]'
                          : 'text-[#16A34A]'
                    }`}
                  />
                  <span
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      isDbConnected ? 'text-[#0E1113]' : 'text-[#DC2626]'
                    }`}
                  >
                    {isDbConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p
                  className={`mt-1.5 font-mono text-xs tabular-nums ${
                    latencyAlert?.severity === 'high-latency'
                      ? 'font-semibold text-[#B45309]'
                      : 'text-[#5A5D57]'
                  }`}
                >
                  Round-trip: {formatLatencyMs(snapshot.database.latencyMs)} · Limit{' '}
                  {latencyThresholdMs} ms
                </p>
                {latencyAlert && (
                  <div className="mt-2.5">
                    <span
                      role="status"
                      aria-live="polite"
                      data-testid="latency-alert-badge"
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap ${
                        latencyAlert.severity === 'high-latency'
                          ? 'border-[#D97706] bg-[#FEF3C7] text-[#92400E]'
                          : latencyAlert.severity === 'unavailable'
                            ? 'border-[#DC2626]/40 bg-[#FEF2F2] text-[#991B1B]'
                            : 'border-[#16A34A]/35 bg-[#F0FDF4] text-[#166534]'
                      }`}
                    >
                      {latencyAlert.severity === 'high-latency' ? (
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                      ) : latencyAlert.severity === 'unavailable' ? (
                        <AlertCircle className="h-3 w-3 shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                      )}
                      <span>{latencyAlert.badgeLabel}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-[#FDFCF9] p-6">
                <p className="text-xs font-medium text-[#5A5D57]">Service Uptime</p>
                <p className="mt-2.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                  {snapshot.uptimeFormatted}
                </p>
                <p className="mt-1.5 font-mono text-xs text-[#5A5D57] tabular-nums">
                  Since {formatIsoDateTime(snapshot.startedAt)}
                </p>
              </div>

              <div className="bg-[#FDFCF9] p-6">
                <p className="text-xs font-medium text-[#5A5D57]">
                  Observed Availability
                </p>
                <p className="mt-2.5 font-mono text-2xl font-bold text-[#0E1113] tabular-nums">
                  {snapshot.availabilityPercent.toFixed(1)}%
                </p>
                <p className="mt-1.5 font-mono text-xs text-[#5A5D57] tabular-nums">
                  Across {snapshot.recentChecks.length}{' '}
                  {snapshot.recentChecks.length === 1 ? 'check' : 'checks'}
                </p>
              </div>
            </section>

            {/* Latency Alert Threshold Configuration Bar */}
            <section
              aria-label="Database latency alert threshold"
              className="border border-[#0E1113]/15 bg-[#FDFCF9] px-6 py-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-2.5">
                  <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1113]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#0E1113]">
                      Database Latency Alert Threshold
                    </h2>
                    <p className="mt-0.5 text-xs text-[#5A5D57]">
                      Triggers alert badge &amp; toast notification above{' '}
                      <span className="font-mono font-semibold text-[#0E1113] tabular-nums">
                        {latencyThresholdMs} ms
                      </span>
                      {recentThresholdBreaches > 0 && (
                        <span className="ml-1.5 font-mono font-semibold text-[#B45309]">
                          · {recentThresholdBreaches} recent{' '}
                          {recentThresholdBreaches === 1 ? 'breach' : 'breaches'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleToastAlerts}
                      aria-pressed={toastAlertsEnabled}
                      data-testid="toast-alerts-toggle"
                      className={`inline-flex h-8 items-center gap-1.5 border px-2.5 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                        toastAlertsEnabled
                          ? 'border-[#0E1113]/30 bg-[#FDFCF9] font-semibold text-[#0E1113]'
                          : 'border-[#0E1113]/15 bg-[#F4F2EC]/60 text-[#5A5D57]'
                      }`}
                    >
                      {toastAlertsEnabled ? (
                        <Bell className="h-3 w-3 text-[#C8232C]" />
                      ) : (
                        <BellOff className="h-3 w-3" />
                      )}
                      <span>
                        {toastAlertsEnabled ? 'Toast Alerts: On' : 'Toast Alerts: Off'}
                      </span>
                    </button>

                    <div className="flex items-center gap-1" role="group" aria-label="Latency threshold presets">
                      {LATENCY_THRESHOLD_PRESETS_MS.map((presetMs) => {
                        const active = latencyThresholdMs === presetMs;
                        return (
                          <button
                            key={presetMs}
                            type="button"
                            onClick={() => persistLatencyThreshold(presetMs)}
                            aria-pressed={active}
                            className={`h-8 border px-2.5 font-mono text-[11px] tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                              active
                                ? 'border-[#0E1113] bg-[#0E1113] font-semibold text-[#FDFCF9]'
                                : 'border-[#0E1113]/20 bg-[#F4F2EC]/60 text-[#0E1113] hover:border-[#0E1113]'
                            }`}
                          >
                            {presetMs}ms
                          </button>
                        );
                      })}
                    </div>

                    <form
                      onSubmit={handleThresholdSubmit}
                      className="flex items-center gap-1.5"
                      noValidate
                    >
                      <label htmlFor="latency-threshold-input" className="sr-only">
                        Custom latency alert threshold in milliseconds
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="latency-threshold-input"
                          type="number"
                          inputMode="numeric"
                          min={MIN_LATENCY_ALERT_THRESHOLD_MS}
                          max={MAX_LATENCY_ALERT_THRESHOLD_MS}
                          step={10}
                          value={thresholdInput}
                          onChange={(e) => {
                            setThresholdInput(e.target.value);
                            if (thresholdValidationError) {
                              setThresholdValidationError(null);
                            }
                          }}
                          className="h-8 w-24 border border-[#0E1113]/25 bg-[#F4F2EC]/50 pl-2.5 pr-8 font-mono text-xs text-[#0E1113] tabular-nums outline-none focus:border-[#0E1113]"
                        />
                        <span className="pointer-events-none absolute right-2 font-mono text-[10px] text-[#5A5D57]">
                          ms
                        </span>
                      </div>
                      <button
                        type="submit"
                        className="h-8 border border-[#0E1113] bg-[#0E1113] px-3 font-mono text-[11px] font-semibold text-[#FDFCF9] transition-colors hover:bg-[#C8232C] hover:border-[#C8232C] cursor-pointer whitespace-nowrap"
                      >
                        Set Limit
                      </button>
                      {latencyThresholdMs !== DEFAULT_LATENCY_ALERT_THRESHOLD_MS && (
                        <button
                          type="button"
                          onClick={() =>
                            persistLatencyThreshold(DEFAULT_LATENCY_ALERT_THRESHOLD_MS)
                          }
                          className="h-8 border border-[#0E1113]/20 px-2.5 font-mono text-[11px] text-[#5A5D57] transition-colors hover:border-[#0E1113] hover:text-[#0E1113] cursor-pointer whitespace-nowrap"
                        >
                          Reset 500ms
                        </button>
                      )}
                    </form>
                  </div>
                  {thresholdValidationError && (
                    <p
                      role="alert"
                      className="font-mono text-[11px] text-[#DC2626]"
                    >
                      {thresholdValidationError}
                    </p>
                  )}
                </div>
              </div>

              {/* Manual Critical Latency Threshold Row */}
              <div className="mt-4 flex flex-col gap-3 border-t border-[#0E1113]/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#9333EA]"
                    aria-hidden="true"
                  />
                  <div>
                    <label
                      htmlFor="critical-latency-threshold-input"
                      className="block text-sm font-semibold text-[#0E1113]"
                    >
                      Critical Latency Threshold
                    </label>
                    <p className="mt-0.5 text-xs text-[#5A5D57]">
                      Visually flags chart data points exceeding{' '}
                      <span
                        data-testid="active-critical-latency-value"
                        className="font-mono font-semibold text-[#7E22CE] tabular-nums"
                      >
                        {criticalLatencyThresholdMs} ms
                      </span>{' '}
                      in purple across latency charts
                      {recentCriticalCount > 0 && (
                        <span
                          data-testid="critical-latency-count"
                          className="ml-1.5 font-mono font-semibold text-[#7E22CE]"
                        >
                          · {recentCriticalCount} recent critical{' '}
                          {recentCriticalCount === 1 ? 'point' : 'points'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 lg:items-end shrink-0">
                  <form
                    onSubmit={handleCriticalThresholdSubmit}
                    className="flex flex-wrap items-center gap-1.5"
                    noValidate
                  >
                    <div className="relative flex items-center">
                      <input
                        id="critical-latency-threshold-input"
                        data-testid="critical-latency-input"
                        type="number"
                        inputMode="numeric"
                        min={MIN_CRITICAL_LATENCY_THRESHOLD_MS}
                        max={MAX_CRITICAL_LATENCY_THRESHOLD_MS}
                        step={10}
                        value={criticalThresholdInput}
                        onChange={(e) =>
                          handleCriticalThresholdInputChange(e.target.value)
                        }
                        aria-describedby="critical-latency-help"
                        className="h-8 w-28 border border-[#9333EA]/45 bg-[#FAF5FF]/70 pl-2.5 pr-8 font-mono text-xs font-semibold text-[#0E1113] tabular-nums outline-none focus:border-[#9333EA]"
                      />
                      <span className="pointer-events-none absolute right-2 font-mono text-[10px] text-[#7E22CE]">
                        ms
                      </span>
                    </div>
                    <span id="critical-latency-help" className="sr-only">
                      Enter a Critical Latency value in milliseconds between 10 and 10000
                    </span>
                    <button
                      type="submit"
                      data-testid="critical-latency-submit"
                      className="h-8 border border-[#7E22CE] bg-[#7E22CE] px-3 font-mono text-[11px] font-semibold text-[#FDFCF9] transition-colors hover:bg-[#6B21A8] cursor-pointer whitespace-nowrap"
                    >
                      Set Critical
                    </button>
                    {criticalLatencyThresholdMs !==
                      DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS && (
                      <button
                        type="button"
                        data-testid="critical-latency-reset"
                        onClick={() =>
                          persistCriticalLatencyThreshold(
                            DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS,
                            true,
                          )
                        }
                        className="h-8 border border-[#0E1113]/20 px-2.5 font-mono text-[11px] text-[#5A5D57] transition-colors hover:border-[#0E1113] hover:text-[#0E1113] cursor-pointer whitespace-nowrap"
                      >
                        Reset {DEFAULT_CRITICAL_LATENCY_THRESHOLD_MS}ms
                      </button>
                    )}
                  </form>
                  {criticalThresholdValidationError && (
                    <p
                      role="alert"
                      data-testid="critical-latency-error"
                      className="font-mono text-[11px] text-[#DC2626]"
                    >
                      {criticalThresholdValidationError}
                    </p>
                  )}
                </div>
              </div>

              {/* Independent System Health Alert Channel Toggle Switches */}
              <div
                data-testid="alert-channel-controls"
                className="mt-4 border-t border-[#0E1113]/10 pt-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 shrink-0 text-[#0E1113]" />
                    <h3 className="text-sm font-semibold text-[#0E1113]">
                      Alert Channel Controls
                    </h3>
                    <span
                      data-testid="alert-channels-active-count"
                      className={`inline-flex items-center border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                        enabledAlertCount === HEALTH_ALERT_CHANNELS.length
                          ? 'border-[#16A34A]/30 bg-[#F0FDF4] text-[#15803D]'
                          : enabledAlertCount === 0
                            ? 'border-[#0E1113]/15 bg-[#F4F2EC] text-[#5A5D57]'
                            : 'border-[#D97706]/35 bg-[#FFFBEB] text-[#B45309]'
                      }`}
                    >
                      {enabledAlertCount} of {HEALTH_ALERT_CHANNELS.length} active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="alert-channels-enable-all"
                      onClick={() => setAllAlertPreferences(true)}
                      disabled={enabledAlertCount === HEALTH_ALERT_CHANNELS.length}
                      className="border border-[#0E1113]/20 bg-[#FDFCF9] px-2.5 py-1 font-mono text-[11px] font-medium text-[#0E1113] transition hover:border-[#0E1113] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      data-testid="alert-channels-mute-all"
                      onClick={() => setAllAlertPreferences(false)}
                      disabled={enabledAlertCount === 0}
                      className="border border-[#0E1113]/20 bg-[#FDFCF9] px-2.5 py-1 font-mono text-[11px] font-medium text-[#5A5D57] transition hover:border-[#0E1113] hover:text-[#0E1113] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      Mute All
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {HEALTH_ALERT_CHANNELS.map((channel) => {
                    const isEnabled = alertPreferences[channel.key];
                    const isMutedIncident = suppressedTypes.includes(channel.key);
                    const detailText =
                      channel.key === 'latency'
                        ? `Alerts when DB latency exceeds ${latencyThresholdMs} ms`
                        : channel.description;

                    return (
                      <div
                        key={channel.key}
                        className={`flex items-start justify-between gap-3 border px-3.5 py-3 transition-colors ${
                          isEnabled
                            ? 'border-[#0E1113]/15 bg-[#FDFCF9]'
                            : 'border-[#0E1113]/10 bg-[#F4F2EC]/65'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold ${
                                isEnabled ? 'text-[#0E1113]' : 'text-[#5A5D57]'
                              }`}
                            >
                              {channel.label}
                            </span>
                            {isMutedIncident && (
                              <span className="border border-[#D97706]/40 bg-[#FEF3C7] px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-[#92400E]">
                                Muted
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#5A5D57]">
                            {detailText}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label={`Toggle ${channel.label}`}
                            data-testid={`alert-toggle-${channel.key}`}
                            onClick={() => toggleAlertPreference(channel.key)}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E1113] ${
                              isEnabled
                                ? 'border-[#16A34A] bg-[#16A34A]'
                                : 'border-[#0E1113]/25 bg-[#D8D5CC]'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-[#FDFCF9] shadow-xs transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <span
                            className={`font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              isEnabled ? 'text-[#15803D]' : 'text-[#5A5D57]'
                            }`}
                          >
                            {isEnabled ? 'On' : 'Off'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Component Diagnostics Table */}
            <section
              aria-label="Service components"
              className="border border-[#0E1113]/15 bg-[#FDFCF9]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1113]/12 px-6 py-4">
                <h2 className="text-base font-semibold text-[#0E1113]">
                  Service Components
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#5A5D57]">
                  <span className="font-mono">Node {snapshot.runtime.nodeVersion}</span>
                  <span aria-hidden="true">·</span>
                  <a
                    href="/api/system-health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C]"
                  >
                    Raw JSON
                  </a>
                  <span aria-hidden="true">·</span>
                  <a
                    href="/api/system-health/metrics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C]"
                  >
                    Metrics JSON
                  </a>
                  <span aria-hidden="true">·</span>
                  <a
                    href="/api/system-health/view"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#0E1113] underline underline-offset-4 hover:text-[#C8232C]"
                  >
                    Standalone View
                  </a>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#0E1113]/10 text-xs text-[#5A5D57]">
                      <th className="px-6 py-3 font-medium whitespace-nowrap">Component</th>
                      <th className="px-6 py-3 font-medium whitespace-nowrap">Status</th>
                      <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                        Latency / Footprint
                      </th>
                      <th className="px-6 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0E1113]/8">
                    <tr className="transition-colors hover:bg-[#F4F2EC]/60">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Database className="h-4 w-4 shrink-0 text-[#5A5D57]" />
                          <span className="font-semibold text-[#0E1113]">
                            {snapshot.database.engine}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold whitespace-nowrap">
                        <span
                          className={
                            isDbConnected ? 'text-[#16A34A]' : 'text-[#DC2626]'
                          }
                        >
                          {isDbConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-[#0E1113] tabular-nums whitespace-nowrap">
                        {formatLatencyMs(snapshot.database.latencyMs)} · Pool{' '}
                        {snapshot.database.pool.total}/{snapshot.database.pool.idle} idle
                        {snapshot.database.pool.waiting > 0
                          ? ` (${snapshot.database.pool.waiting} waiting)`
                          : ''}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#5A5D57]">
                        {snapshot.database.message}
                      </td>
                    </tr>
                    <tr className="transition-colors hover:bg-[#F4F2EC]/60">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Server className="h-4 w-4 shrink-0 text-[#5A5D57]" />
                          <span className="font-semibold text-[#0E1113]">
                            Express API Service
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-[#16A34A] whitespace-nowrap">
                        Operational
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-[#0E1113] tabular-nums whitespace-nowrap">
                        {snapshot.runtime.memoryRssMb.toFixed(1)} MB RSS ·{' '}
                        {snapshot.runtime.heapUsedMb.toFixed(1)} MB Heap
                      </td>
                      <td className="px-6 py-4 text-xs text-[#5A5D57]">
                        Handling storefront catalog, checkout, tracking, and member routes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Real-Time Cloud SQL Latency Trends (Recharts + Anomaly Detection) */}
            <DatabaseLatencyChart
              thresholdMs={latencyThresholdMs}
              criticalThresholdMs={criticalLatencyThresholdMs}
              onThresholdChange={persistLatencyThreshold}
              externalLiveMode={liveMode}
              anomalyDetectionEnabled={anomalyDetectionEnabled}
              onAnomalyDetectionChange={setAnomalyDetectionEnabled}
              anomalySigma={anomalySigma}
              onAnomalySigmaChange={setAnomalySigma}
              onMetricsLoaded={handleMetricsLoaded}
              defaultPollSeconds={0}
              refreshSignal={metricsRefreshSignal}
            />

            {/* Last-Hour Average System Latency Line Chart (Recharts · Syncs with Live Mode) */}
            <HourlyAverageLatencyChart
              hourlyLatency={snapshot.hourlyLatency}
              fallbackSamples={snapshot.recentChecks}
              thresholdMs={latencyThresholdMs}
              criticalThresholdMs={criticalLatencyThresholdMs}
              liveMode={liveMode}
              lastUpdatedAt={snapshot.checkedAt}
            />

            {/* Last-Hour Response Time Distribution Histogram (Recharts) */}
            <LatencyHistogramChart
              histogram={snapshot.hourlyLatencyHistogram}
              fallbackSamples={snapshot.recentChecks}
              thresholdMs={latencyThresholdMs}
              criticalThresholdMs={criticalLatencyThresholdMs}
              liveMode={liveMode}
              lastUpdatedAt={snapshot.checkedAt}
            />

            {/* 24-Hour System Uptime Percentage Chart (Recharts) */}
            <SystemUptimeChart
              uptime24h={snapshot.uptime24h}
              fallbackSamples={snapshot.recentChecks}
              liveMode={liveMode}
            />

            {/* Simplified Uptime Probe History */}
            <section
              aria-label="Recent uptime checks"
              className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0E1113]" />
                  <h2 className="text-base font-semibold text-[#0E1113]">
                    Uptime Check History
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#5A5D57] tabular-nums">
                  Latest {snapshot.recentChecks.length} of 20 probes
                </span>
              </div>

              {/* Visual Uptime Bar */}
              <div
                className="mt-5 flex items-end gap-1.5"
                role="img"
                aria-label={`Uptime bar showing ${snapshot.availabilityPercent.toFixed(1)}% availability across ${snapshot.recentChecks.length} probes`}
              >
                {Array.from({ length: 20 }).map((_, idx) => {
                  const offset = 20 - snapshot.recentChecks.length;
                  const sample = idx >= offset ? snapshot.recentChecks[idx - offset] : null;
                  const isSlowSample = Boolean(
                    sample &&
                      sample.databaseStatus === 'connected' &&
                      sample.latencyMs !== null &&
                      Math.round(sample.latencyMs) > latencyThresholdMs,
                  );
                  const barClass = !sample
                    ? 'bg-[#EAE7DF]'
                    : sample.databaseStatus !== 'connected'
                      ? 'bg-[#DC2626]'
                      : isSlowSample
                        ? 'bg-[#D97706]'
                        : 'bg-[#16A34A]';
                  const titleText = sample
                    ? `${formatIsoClock(sample.checkedAt)} — ${
                        sample.databaseStatus !== 'connected'
                          ? 'Disconnected'
                          : isSlowSample
                            ? `High Latency (>${latencyThresholdMs}ms)`
                            : 'Connected'
                      } (${formatLatencyMs(sample.latencyMs)})`
                    : 'No probe recorded yet';
                  return (
                    <div
                      key={idx}
                      title={titleText}
                      className={`h-8 flex-1 transition-opacity hover:opacity-80 ${barClass}`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#5A5D57]">
                <span>Older checks</span>
                <span>
                  Green: ≤{latencyThresholdMs}ms · Amber: &gt;{latencyThresholdMs}ms · Red:
                  Unreachable
                </span>
                <span>Most recent</span>
              </div>
            </section>

            {/* Chronological Cloud SQL Connection Attempt Log (Last 5) */}
            <section
              aria-label="Cloud SQL connection attempt log"
              data-testid="cloud-sql-connection-log"
              className="border border-[#0E1113]/15 bg-[#FDFCF9]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1113]/12 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#0E1113]" />
                  <div>
                    <h2 className="text-base font-semibold text-[#0E1113]">
                      Cloud SQL Connection Log
                    </h2>
                    <p className="text-xs text-[#5A5D57]">
                      Chronological record of the last 5 Cloud SQL connection attempts
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-[#5A5D57] tabular-nums">
                    {chronologicalConnectionLogs.length} of 5 max · Oldest → Latest
                  </span>
                  {exportFeedback && (
                    <span
                      role="status"
                      className="font-mono text-[11px] font-semibold text-[#15803D]"
                    >
                      {exportFeedback}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleExportConnectionLogsCsv}
                    disabled={chronologicalConnectionLogs.length === 0}
                    data-testid="export-connection-logs-csv"
                    aria-label="Download last 5 Cloud SQL connection attempt logs as CSV"
                    title="Download last 5 Cloud SQL connection attempt logs as CSV"
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0 ${
                      exportFeedback
                        ? 'border-[#16A34A] bg-[#16A34A]/10 text-[#15803D]'
                        : 'border-[#0E1113]/25 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9]'
                    }`}
                  >
                    {exportFeedback ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>Export Last 5 CSV</span>
                  </button>
                </div>
              </div>

              {chronologicalConnectionLogs.length === 0 ? (
                <div className="px-6 py-8 text-center text-xs text-[#5A5D57]">
                  No Cloud SQL connection attempts recorded yet. Click{' '}
                  <span className="font-semibold text-[#0E1113]">Run Live Check</span> to
                  probe the database instance.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#0E1113]/10 text-[#5A5D57]">
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Attempt</th>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">Timestamp</th>
                        <th className="px-6 py-3 font-medium whitespace-nowrap">
                          Resulting Status
                        </th>
                        <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                          Latency
                        </th>
                        <th className="px-6 py-3 font-medium">Diagnostic Output</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0E1113]/8">
                      {chronologicalConnectionLogs.map((entry) => {
                        const connected = entry.databaseStatus === 'connected';
                        const exceedsThreshold =
                          connected &&
                          entry.latencyMs !== null &&
                          Math.round(entry.latencyMs) > latencyThresholdMs;
                        return (
                          <tr
                            key={`${entry.sequenceNumber}-${entry.checkedAt}`}
                            data-testid="connection-log-row"
                            className={`transition-colors hover:bg-[#F4F2EC]/60 ${
                              entry.isLatest ? 'bg-[#F4F2EC]/45' : ''
                            }`}
                          >
                            <td className="px-6 py-3.5 font-mono text-[#5A5D57] tabular-nums whitespace-nowrap">
                              <span className="font-semibold text-[#0E1113]">
                                #{String(entry.sequenceNumber).padStart(2, '0')}
                              </span>
                              {entry.isLatest && (
                                <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A5D57]">
                                  Latest
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 font-mono text-[#0E1113] tabular-nums whitespace-nowrap">
                              {formatIsoDateTime(entry.checkedAt)}
                            </td>
                            <td className="px-6 py-3.5 font-mono font-semibold whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  !connected
                                    ? 'text-[#DC2626]'
                                    : exceedsThreshold
                                      ? 'text-[#B45309]'
                                      : 'text-[#16A34A]'
                                }`}
                              >
                                {!connected ? (
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                ) : exceedsThreshold ? (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>
                                  {!connected
                                    ? 'Disconnected'
                                    : exceedsThreshold
                                      ? 'Connected · Slow'
                                      : 'Connected'}
                                </span>
                              </span>
                            </td>
                            <td
                              className={`px-6 py-3.5 text-right font-mono tabular-nums whitespace-nowrap ${
                                exceedsThreshold
                                  ? 'font-semibold text-[#B45309]'
                                  : 'text-[#0E1113]'
                              }`}
                            >
                              {formatLatencyMs(entry.latencyMs)}
                            </td>
                            <td className="px-6 py-3.5 text-[#5A5D57]">
                              {entry.message}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : chronologicalConnectionLogs.length > 0 ? (
          <section
            aria-label="Cloud SQL connection attempt log"
            data-testid="cloud-sql-connection-log"
            className="mt-8 border border-[#0E1113]/15 bg-[#FDFCF9]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1113]/12 px-6 py-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0E1113]" />
                <h2 className="text-base font-semibold text-[#0E1113]">
                  Cloud SQL Connection Log
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-[#5A5D57] tabular-nums">
                  {chronologicalConnectionLogs.length} of 5 max · Oldest → Latest
                </span>
                {exportFeedback && (
                  <span
                    role="status"
                    className="font-mono text-[11px] font-semibold text-[#15803D]"
                  >
                    {exportFeedback}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleExportConnectionLogsCsv}
                  disabled={chronologicalConnectionLogs.length === 0}
                  data-testid="export-connection-logs-csv"
                  aria-label="Download last 5 Cloud SQL connection attempt logs as CSV"
                  title="Download last 5 Cloud SQL connection attempt logs as CSV"
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0 ${
                    exportFeedback
                      ? 'border-[#16A34A] bg-[#16A34A]/10 text-[#15803D]'
                      : 'border-[#0E1113]/25 bg-[#FDFCF9] text-[#0E1113] hover:border-[#0E1113] hover:bg-[#0E1113] hover:text-[#FDFCF9]'
                  }`}
                >
                  {exportFeedback ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Download className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>Export Last 5 CSV</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#0E1113]/10 text-[#5A5D57]">
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Attempt</th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Timestamp</th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">
                      Resulting Status
                    </th>
                    <th className="px-6 py-3 font-medium">Diagnostic Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E1113]/8">
                  {chronologicalConnectionLogs.map((entry) => (
                    <tr
                      key={`${entry.sequenceNumber}-${entry.checkedAt}`}
                      data-testid="connection-log-row"
                    >
                      <td className="px-6 py-3.5 font-mono font-semibold text-[#0E1113] tabular-nums whitespace-nowrap">
                        #{String(entry.sequenceNumber).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[#0E1113] tabular-nums whitespace-nowrap">
                        {formatIsoDateTime(entry.checkedAt)}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-[#DC2626] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>Disconnected</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-[#5A5D57]">{entry.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      {/* Latency Threshold Exceeded Toast Notifications */}
      {latencyToasts.length > 0 && (
        <div
          aria-live="assertive"
          aria-label="Database latency threshold alerts"
          data-testid="latency-toast-container"
          className="fixed right-4 bottom-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 sm:right-5 sm:bottom-5"
        >
          {latencyToasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className="relative overflow-hidden border border-[#FDFCF9]/15 bg-[#0E1113] py-3.5 pr-3.5 pl-4 text-[#FDFCF9] shadow-2xl"
            >
              <div
                className="absolute inset-y-0 left-0 w-1 bg-[#DC2626]"
                aria-hidden="true"
              />
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#F87171]"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#F87171]">
                      {toast.title}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-[#FDFCF9]/60">
                      {formatIsoClock(toast.checkedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-[#FDFCF9]">
                    {toast.message}
                  </p>
                  {toast.latencyMs !== undefined &&
                    toast.thresholdMs !== undefined &&
                    toast.excessMs !== undefined && (
                      <p className="mt-1.5 font-mono text-[10px] tabular-nums text-[#FBBF24]">
                        Observed {toast.latencyMs} ms · Limit {toast.thresholdMs} ms (+
                        {toast.excessMs} ms)
                      </p>
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissLatencyToast(toast.id)}
                  aria-label="Dismiss latency alert"
                  className="shrink-0 p-0.5 text-[#FDFCF9]/55 transition hover:text-[#FDFCF9] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

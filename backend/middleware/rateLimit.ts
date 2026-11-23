import type { NextFunction, Request, Response } from 'express';

export interface RateLimitEntry {
  count: number;
  resetAtMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  /** Bucket identifier used to isolate tiered limiters (e.g., 'api-general', 'api-sensitive') */
  bucket: string;
  /** Window duration in milliseconds (default: 60_000 = 1 minute) */
  windowMs: number;
  /** Maximum requests permitted per key within the active window */
  maxRequests: number;
  /** Maximum tracked keys in memory to prevent unbounded memory growth under IP-flood DoS */
  maxEntries?: number;
  /** Optional clock override for deterministic unit tests */
  nowMs?: () => number;
  /** Optional key resolver override (defaults to Express req.ip / socket address) */
  keyGenerator?: (req: Request) => string;
  /** Optional skip predicate */
  skip?: (req: Request) => boolean;
}

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_GENERAL_MAX_REQUESTS = 120;
export const DEFAULT_SENSITIVE_MAX_REQUESTS = 20;
export const DEFAULT_WEBHOOK_MAX_REQUESTS = 60;
export const DEFAULT_ADMIN_MAX_REQUESTS = 60;
export const DEFAULT_MAX_STORE_ENTRIES = 10_000;

export function resolveClientIp(req: Request): string {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return ip.replace(/^::ffff:/, '').trim() || 'unknown';
}

/**
 * Pure, bounded in-memory fixed-window rate limiter store.
 * Automatically prunes expired buckets and evicts oldest entries when `maxEntries` is reached.
 */
export class InMemoryRateLimitStore {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_STORE_ENTRIES) {
    this.maxEntries = Math.max(100, Math.floor(maxEntries));
  }

  consume(
    key: string,
    windowMs: number,
    maxRequests: number,
    nowMs = Date.now(),
  ): RateLimitDecision {
    const safeWindowMs = Math.max(1_000, Math.floor(windowMs));
    const safeMax = Math.max(1, Math.floor(maxRequests));

    let entry = this.entries.get(key);
    if (!entry || nowMs >= entry.resetAtMs) {
      this.pruneIfNeeded(nowMs);
      entry = {
        count: 0,
        resetAtMs: nowMs + safeWindowMs,
      };
      this.entries.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, safeMax - entry.count);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAtMs - nowMs) / 1000),
    );
    const allowed = entry.count <= safeMax;

    return {
      allowed,
      limit: safeMax,
      remaining,
      resetAtMs: entry.resetAtMs,
      retryAfterSeconds,
    };
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneIfNeeded(nowMs: number): void {
    if (this.entries.size < this.maxEntries) {
      return;
    }

    // 1. Remove expired windows first
    for (const [key, entry] of this.entries.entries()) {
      if (nowMs >= entry.resetAtMs) {
        this.entries.delete(key);
      }
    }

    // 2. If still at capacity under high-cardinality IP flood, evict oldest entries (Map preserves insertion order)
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const store = new InMemoryRateLimitStore(config.maxEntries);
  const getNowMs = config.nowMs ?? (() => Date.now());
  const resolveKey = config.keyGenerator ?? resolveClientIp;

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (config.skip?.(req)) {
      next();
      return;
    }

    const nowMs = getNowMs();
    const clientKey = `${config.bucket}:${resolveKey(req)}`;
    const decision = store.consume(
      clientKey,
      config.windowMs,
      config.maxRequests,
      nowMs,
    );

    const resetSeconds = Math.max(
      1,
      Math.ceil((decision.resetAtMs - nowMs) / 1000),
    );

    // Standard IETF Draft + X-RateLimit headers for client/proxy visibility
    res.setHeader('RateLimit-Limit', String(decision.limit));
    res.setHeader('RateLimit-Remaining', String(decision.remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));
    res.setHeader('X-RateLimit-Limit', String(decision.limit));
    res.setHeader('X-RateLimit-Remaining', String(decision.remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        retryAfterSeconds: decision.retryAfterSeconds,
      });
      return;
    }

    next();
  };

  return Object.assign(middleware, { store });
}

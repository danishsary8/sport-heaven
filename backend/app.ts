import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { apiRouter } from './routes/apiRouter.ts';
import {
  createAdminRouter,
  type AdminRouterDeps,
} from './routes/adminRouter.ts';
import { createSystemHealthRouter } from './health/systemHealthRouter.ts';
import type { DatabaseProbeFn } from './health/systemHealthService.ts';
import type { AuthRequest, CheckAdminRoleFn, VerifyIdTokenFn } from './middleware/auth.ts';
import {
  createRateLimitMiddleware,
  DEFAULT_ADMIN_MAX_REQUESTS,
  DEFAULT_GENERAL_MAX_REQUESTS,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_SENSITIVE_MAX_REQUESTS,
  DEFAULT_WEBHOOK_MAX_REQUESTS,
} from './middleware/rateLimit.ts';
import {
  createPaymentWebhookRouter,
  type PaymentWebhookRouterDeps,
} from './payments/webhookRouter.ts';

export interface RateLimitOptions {
  enabled?: boolean;
  windowMs?: number;
  maxRequests?: number;
  sensitiveMaxRequests?: number;
  webhookMaxRequests?: number;
  adminMaxRequests?: number;
  nowMs?: () => number;
}

export interface BackendAppOptions {
  probeDatabase?: DatabaseProbeFn;
  verifyToken?: VerifyIdTokenFn;
  checkAdminRole?: CheckAdminRoleFn;
  webhookDeps?: PaymentWebhookRouterDeps;
  adminDeps?: AdminRouterDeps;
  rateLimit?: RateLimitOptions;
}

export function createBackendApp(options?: BackendAppOptions) {
  const app = express();

  app.disable('x-powered-by');
  // Trust the first reverse proxy hop (Cloud Run / load balancer) so req.ip reflects the real client IP
  app.set('trust proxy', 1);

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as AuthRequest).rawBody = Buffer.from(buf);
      },
    }),
  );

  // Defensive security headers compatible with embedded preview iframes (no X-Frame-Options)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
    next();
  });

  // Tiered API rate limiting to prevent abuse, enumeration, and resource exhaustion
  const rateLimitEnabled = options?.rateLimit?.enabled !== false;
  if (rateLimitEnabled) {
    const windowMs =
      options?.rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
    const nowMs = options?.rateLimit?.nowMs;

    const generalApiLimiter = createRateLimitMiddleware({
      bucket: 'api-general',
      windowMs,
      maxRequests:
        options?.rateLimit?.maxRequests ?? DEFAULT_GENERAL_MAX_REQUESTS,
      nowMs,
    });

    const sensitivePublicLimiter = createRateLimitMiddleware({
      bucket: 'api-sensitive-public',
      windowMs,
      maxRequests:
        options?.rateLimit?.sensitiveMaxRequests ??
        DEFAULT_SENSITIVE_MAX_REQUESTS,
      nowMs,
    });

    const webhookLimiter = createRateLimitMiddleware({
      bucket: 'api-webhooks',
      windowMs,
      maxRequests:
        options?.rateLimit?.webhookMaxRequests ?? DEFAULT_WEBHOOK_MAX_REQUESTS,
      nowMs,
    });

    const adminLimiter = createRateLimitMiddleware({
      bucket: 'api-admin',
      windowMs,
      maxRequests:
        options?.rateLimit?.adminMaxRequests ?? DEFAULT_ADMIN_MAX_REQUESTS,
      nowMs,
    });

    app.use('/api', generalApiLimiter);
    app.use('/api/orders/track', sensitivePublicLimiter);
    app.post('/api/orders', sensitivePublicLimiter);
    app.post('/api/questions', sensitivePublicLimiter);
    app.use('/api/webhooks/payments', webhookLimiter);
    app.use('/api/admin', adminLimiter);
  }

  app.use(
    '/api/system-health',
    createSystemHealthRouter({ probeDatabase: options?.probeDatabase }),
  );
  app.use(
    '/api/webhooks/payments',
    createPaymentWebhookRouter(options?.webhookDeps),
  );
  app.use(
    '/api/admin',
    createAdminRouter({
      verifyToken: options?.verifyToken,
      checkAdminRole: options?.checkAdminRole,
      ...options?.adminDeps,
    }),
  );
  app.use('/api', apiRouter);

  // Explicit JSON 404 for unknown API paths so SPA fallback never intercepts /api/*
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Centralized sanitized error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status?: number }).status === 400
    ) {
      res.status(400).json({ error: 'Malformed JSON request body' });
      return;
    }

    console.error('[SportCastle API] Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}



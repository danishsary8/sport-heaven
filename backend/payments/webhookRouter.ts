import { Router } from 'express';
import type { NextFunction, Response } from 'express';
import { ZodError } from 'zod';
import type { AuthRequest } from '../middleware/auth.ts';
import {
  dispatchOrderNotifications,
  type NotificationDeliveryResult,
} from '../notifications/notificationService.ts';
import {
  recordPaymentWebhookAndApplyOrderUpdate,
  type PaymentWebhookProcessResult,
} from '../repositories/adminRepository.ts';
import {
  abaKhqrWebhookSchema,
  stripeWebhookSchema,
} from '../validators/schemas.ts';
import {
  normalizeAbaKhqrWebhookOutcome,
  normalizeStripeWebhookOutcome,
  verifyAbaKhqrSignature,
  verifyStripeSignature,
  type NormalizedPaymentWebhookOutcome,
} from './webhookCrypto.ts';

export interface PaymentWebhookRouterDeps {
  getAbaSecret?: () => string | undefined;
  getStripeSecret?: () => string | undefined;
  processWebhook?: (params: {
    outcome: NormalizedPaymentWebhookOutcome;
    rawPayload: unknown;
    signatureValid: boolean;
  }) => Promise<PaymentWebhookProcessResult>;
  dispatchNotifications?: typeof dispatchOrderNotifications;
  nowMs?: () => number;
}

function getRawBodyBuffer(req: AuthRequest): Buffer {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  return Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
}

function readHeader(req: AuthRequest, name: string): string | undefined {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return typeof val === 'string' ? val : undefined;
}

export function createPaymentWebhookRouter(deps?: PaymentWebhookRouterDeps) {
  const router = Router();

  const getAbaSecret =
    deps?.getAbaSecret ?? (() => process.env.ABA_WEBHOOK_SECRET);
  const getStripeSecret =
    deps?.getStripeSecret ?? (() => process.env.STRIPE_WEBHOOK_SECRET);
  const processWebhook =
    deps?.processWebhook ?? recordPaymentWebhookAndApplyOrderUpdate;
  const dispatchNotifications =
    deps?.dispatchNotifications ?? dispatchOrderNotifications;
  const nowMs = deps?.nowMs ?? (() => Date.now());

  const firePaymentConfirmedNotifications = (
    result: PaymentWebhookProcessResult,
    paymentReference: string | null,
  ): Promise<NotificationDeliveryResult[]> | null => {
    if (!result.duplicate && result.orderUpdated && result.order) {
      return dispatchNotifications({
        eventType: 'payment_confirmed',
        order: result.order,
        paymentReference,
      }).catch((err) => {
        console.error(
          '[PaymentWebhook] Failed dispatching payment_confirmed notifications:',
          err,
        );
        return [];
      });
    }
    return null;
  };

  router.post(
    '/aba-khqr',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const rawBody = getRawBodyBuffer(req);
        const signatureHeader =
          readHeader(req, 'x-aba-signature') ??
          readHeader(req, 'x-payway-signature');
        const timestampHeader = readHeader(req, 'x-aba-timestamp');

        const verification = verifyAbaKhqrSignature({
          rawBody,
          signatureHeader,
          timestampHeader,
          secret: getAbaSecret(),
          nowMs: nowMs(),
        });

        if (!verification.valid) {
          if (verification.reason === 'secret_unconfigured') {
            res.status(503).json({
              error: 'ABA KHQR webhook signing secret is not configured',
            });
            return;
          }
          res.status(401).json({
            error: 'Invalid ABA KHQR webhook signature',
            reason: verification.reason,
          });
          return;
        }

        const parsed = abaKhqrWebhookSchema.parse(req.body);
        const outcome = normalizeAbaKhqrWebhookOutcome({
          ...parsed,
          status: parsed.status ?? '',
        });

        const result = await processWebhook({
          outcome,
          rawPayload: parsed,
          signatureValid: true,
        });

        if (outcome.paymentStatus === 'paid') {
          void firePaymentConfirmedNotifications(
            result,
            outcome.paymentReference,
          );
        }

        res.status(200).json({
          received: true,
          provider: 'aba-khqr',
          duplicate: result.duplicate,
          orderUpdated: result.orderUpdated,
          eventId: outcome.providerEventId,
          orderId: outcome.orderId,
          paymentStatus: outcome.paymentStatus,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            error: 'Invalid ABA KHQR webhook payload',
            details: error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          });
          return;
        }
        next(error);
      }
    },
  );

  router.post(
    '/stripe',
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const rawBody = getRawBodyBuffer(req);
        const signatureHeader = readHeader(req, 'stripe-signature');

        const verification = verifyStripeSignature({
          rawBody,
          signatureHeader,
          secret: getStripeSecret(),
          nowMs: nowMs(),
        });

        if (!verification.valid) {
          if (verification.reason === 'secret_unconfigured') {
            res.status(503).json({
              error: 'Stripe webhook signing secret is not configured',
            });
            return;
          }
          res.status(401).json({
            error: 'Invalid Stripe webhook signature',
            reason: verification.reason,
          });
          return;
        }

        const parsed = stripeWebhookSchema.parse(req.body);
        const outcome = normalizeStripeWebhookOutcome(parsed);

        const result = await processWebhook({
          outcome,
          rawPayload: parsed,
          signatureValid: true,
        });

        if (outcome.paymentStatus === 'paid') {
          void firePaymentConfirmedNotifications(
            result,
            outcome.paymentReference,
          );
        }

        res.status(200).json({
          received: true,
          provider: 'stripe',
          duplicate: result.duplicate,
          orderUpdated: result.orderUpdated,
          eventId: outcome.providerEventId,
          orderId: outcome.orderId,
          paymentStatus: outcome.paymentStatus,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            error: 'Invalid Stripe webhook payload',
            details: error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          });
          return;
        }
        next(error);
      }
    },
  );

  return router;
}

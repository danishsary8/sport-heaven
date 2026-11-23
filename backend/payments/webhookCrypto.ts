import crypto from 'node:crypto';

export type PaymentWebhookProvider = 'aba-khqr' | 'stripe';
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface SignatureVerificationResult {
  valid: boolean;
  reason?:
    | 'secret_unconfigured'
    | 'missing_signature'
    | 'malformed_signature'
    | 'timestamp_expired'
    | 'signature_mismatch';
  timestampSeconds?: number;
}

export interface NormalizedPaymentWebhookOutcome {
  provider: PaymentWebhookProvider;
  providerEventId: string;
  eventType: string;
  orderId: string | null;
  paymentStatus: OrderPaymentStatus | null;
  paymentReference: string | null;
  amountUsd: number | null;
  currency: string;
  shouldAdvanceOrderToConfirmed: boolean;
}

export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300; // +/- 5 minutes

export function computeHmacSha256Hex(
  payload: Buffer | string,
  secret: string,
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export function timingSafeEqualHex(expectedHex: string, actualHex: string): boolean {
  const cleanExpected = expectedHex.trim().toLowerCase();
  const cleanActual = actualHex.trim().toLowerCase();

  if (
    cleanExpected.length === 0 ||
    cleanExpected.length !== cleanActual.length ||
    cleanExpected.length % 2 !== 0 ||
    !/^[0-9a-f]+$/.test(cleanExpected) ||
    !/^[0-9a-f]+$/.test(cleanActual)
  ) {
    return false;
  }

  const expectedBuf = Buffer.from(cleanExpected, 'hex');
  const actualBuf = Buffer.from(cleanActual, 'hex');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verifies ABA PayWay / KHQR webhook signatures.
 * Supports either:
 * - Signed timestamp + payload (`${timestamp}.${rawBody}`) when `x-aba-timestamp` is provided (enforces +/- tolerance replay check)
 * - Direct HMAC-SHA256 hex signature over `rawBody` when `x-aba-timestamp` is omitted
 * Signature header may be plain hex or prefixed with `sha256=`.
 */
export function verifyAbaKhqrSignature(params: {
  rawBody: Buffer | string;
  signatureHeader?: string;
  timestampHeader?: string;
  secret?: string;
  nowMs?: number;
  toleranceSeconds?: number;
}): SignatureVerificationResult {
  const secret = params.secret?.trim() ?? '';
  if (!secret) {
    return { valid: false, reason: 'secret_unconfigured' };
  }

  const rawSig = params.signatureHeader?.trim() ?? '';
  if (!rawSig) {
    return { valid: false, reason: 'missing_signature' };
  }

  const normalizedSig = rawSig.startsWith('sha256=')
    ? rawSig.slice('sha256='.length).trim()
    : rawSig;

  if (!/^[0-9a-fA-F]{64}$/.test(normalizedSig)) {
    return { valid: false, reason: 'malformed_signature' };
  }

  const rawBodyStr = Buffer.isBuffer(params.rawBody)
    ? params.rawBody.toString('utf8')
    : params.rawBody;

  const rawTs = params.timestampHeader?.trim();
  if (rawTs) {
    const tsSeconds = Number(rawTs);
    if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) {
      return { valid: false, reason: 'malformed_signature' };
    }
    const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);
    const tolerance =
      params.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
    if (Math.abs(nowSec - tsSeconds) > tolerance) {
      return {
        valid: false,
        reason: 'timestamp_expired',
        timestampSeconds: tsSeconds,
      };
    }

    const expected = computeHmacSha256Hex(`${rawTs}.${rawBodyStr}`, secret);
    if (!timingSafeEqualHex(expected, normalizedSig)) {
      return {
        valid: false,
        reason: 'signature_mismatch',
        timestampSeconds: tsSeconds,
      };
    }
    return { valid: true, timestampSeconds: tsSeconds };
  }

  const expectedDirect = computeHmacSha256Hex(rawBodyStr, secret);
  if (!timingSafeEqualHex(expectedDirect, normalizedSig)) {
    return { valid: false, reason: 'signature_mismatch' };
  }
  return { valid: true };
}

/**
 * Verifies Stripe `Stripe-Signature` header (`t=<unix>,v1=<hmac_hex>[,v1=<hmac_hex>]`).
 * Uses exact Stripe signing string `${t}.${rawBody}` and enforces replay tolerance.
 */
export function verifyStripeSignature(params: {
  rawBody: Buffer | string;
  signatureHeader?: string;
  secret?: string;
  nowMs?: number;
  toleranceSeconds?: number;
}): SignatureVerificationResult {
  const secret = params.secret?.trim() ?? '';
  if (!secret) {
    return { valid: false, reason: 'secret_unconfigured' };
  }

  const header = params.signatureHeader?.trim() ?? '';
  if (!header) {
    return { valid: false, reason: 'missing_signature' };
  }

  let timestampStr: string | null = null;
  const v1Signatures: string[] = [];

  for (const part of header.split(',')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    if (key === 't' && !timestampStr) {
      timestampStr = value;
    } else if (key === 'v1' && value) {
      v1Signatures.push(value);
    }
  }

  if (!timestampStr || v1Signatures.length === 0) {
    return { valid: false, reason: 'malformed_signature' };
  }

  const tsSeconds = Number(timestampStr);
  if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) {
    return { valid: false, reason: 'malformed_signature' };
  }

  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000);
  const tolerance =
    params.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(nowSec - tsSeconds) > tolerance) {
    return {
      valid: false,
      reason: 'timestamp_expired',
      timestampSeconds: tsSeconds,
    };
  }

  const rawBodyStr = Buffer.isBuffer(params.rawBody)
    ? params.rawBody.toString('utf8')
    : params.rawBody;

  const expected = computeHmacSha256Hex(`${timestampStr}.${rawBodyStr}`, secret);
  const matched = v1Signatures.some((sig) => timingSafeEqualHex(expected, sig));

  if (!matched) {
    return {
      valid: false,
      reason: 'signature_mismatch',
      timestampSeconds: tsSeconds,
    };
  }

  return { valid: true, timestampSeconds: tsSeconds };
}

export function normalizeAbaKhqrWebhookOutcome(payload: {
  eventId?: string;
  tran_id: string;
  status: string | number;
  amount: number;
  currency?: string;
  apv?: string;
  order_id?: string;
}): NormalizedPaymentWebhookOutcome {
  const statusStr = String(payload.status).trim().toLowerCase();
  const orderId = (payload.order_id ?? payload.tran_id).trim().toUpperCase();
  const providerEventId =
    payload.eventId?.trim() ||
    `aba:${payload.tran_id.trim()}:${statusStr}:${payload.apv?.trim() || 'std'}`;

  let paymentStatus: OrderPaymentStatus | null = null;
  let eventType = `aba.payment.${statusStr}`;

  if (
    statusStr === '0' ||
    statusStr === '00' ||
    statusStr === 'approved' ||
    statusStr === 'paid' ||
    statusStr === 'completed' ||
    statusStr === 'success'
  ) {
    paymentStatus = 'paid';
    eventType = 'aba.payment.succeeded';
  } else if (
    statusStr === 'failed' ||
    statusStr === 'declined' ||
    statusStr === 'cancelled' ||
    statusStr === 'canceled' ||
    statusStr === 'expired'
  ) {
    paymentStatus = 'failed';
    eventType = 'aba.payment.failed';
  } else if (statusStr === 'refunded' || statusStr === 'reversed') {
    paymentStatus = 'refunded';
    eventType = 'aba.payment.refunded';
  }

  const paymentReference = payload.apv?.trim()
    ? `ABA-${payload.apv.trim()}`
    : `ABA-${payload.tran_id.trim()}`;

  return {
    provider: 'aba-khqr',
    providerEventId,
    eventType,
    orderId,
    paymentStatus,
    paymentReference,
    amountUsd: Number.isFinite(payload.amount) ? payload.amount : null,
    currency: (payload.currency ?? 'USD').toUpperCase(),
    shouldAdvanceOrderToConfirmed: paymentStatus === 'paid',
  };
}

export function normalizeStripeWebhookOutcome(payload: {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      amount_received?: number;
      amount_total?: number;
      amount?: number;
      currency?: string;
      metadata?: Record<string, string | undefined>;
      client_reference_id?: string | null;
      payment_intent?: string | null;
    };
  };
}): NormalizedPaymentWebhookOutcome {
  const obj = payload.data.object;
  const rawOrderId =
    obj.metadata?.orderId ??
    obj.metadata?.order_id ??
    obj.client_reference_id ??
    null;
  const orderId = rawOrderId ? rawOrderId.trim().toUpperCase() : null;

  const cents =
    typeof obj.amount_received === 'number'
      ? obj.amount_received
      : typeof obj.amount_total === 'number'
        ? obj.amount_total
        : typeof obj.amount === 'number'
          ? obj.amount
          : null;

  const amountUsd = cents !== null ? Math.round(cents) / 100 : null;
  const currency = (obj.currency ?? 'usd').toUpperCase();
  const paymentReference =
    (typeof obj.payment_intent === 'string' && obj.payment_intent.trim()) ||
    (typeof obj.id === 'string' && obj.id.trim()) ||
    payload.id;

  let paymentStatus: OrderPaymentStatus | null = null;
  switch (payload.type) {
    case 'payment_intent.succeeded':
    case 'checkout.session.completed':
    case 'charge.succeeded':
      paymentStatus = 'paid';
      break;
    case 'payment_intent.payment_failed':
    case 'checkout.session.expired':
    case 'charge.failed':
      paymentStatus = 'failed';
      break;
    case 'charge.refunded':
      paymentStatus = 'refunded';
      break;
    default:
      paymentStatus = null;
      break;
  }

  return {
    provider: 'stripe',
    providerEventId: payload.id.trim(),
    eventType: payload.type.trim(),
    orderId,
    paymentStatus,
    paymentReference,
    amountUsd,
    currency,
    shouldAdvanceOrderToConfirmed: paymentStatus === 'paid',
  };
}

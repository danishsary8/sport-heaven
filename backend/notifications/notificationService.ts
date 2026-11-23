import crypto from 'node:crypto';
import { db } from '../../src/db/index.ts';
import { notificationLogs } from '../../src/db/schema.ts';
import type { Order, RmaRequest } from '../../src/types/store.ts';

export type NotificationChannel = 'telegram' | 'email';
export type NotificationEventType =
  | 'order_created'
  | 'payment_confirmed'
  | 'status_updated'
  | 'rma_created'
  | 'admin_test';

export type NotificationDeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface NotificationDeliveryResult {
  id: string;
  orderId: string | null;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  recipient: string;
  subject: string;
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
}

export interface NotificationEnvConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  resendApiKey?: string;
  fromEmail?: string;
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export type PersistNotificationLogFn = (
  record: NotificationDeliveryResult,
) => Promise<void>;

export function escapeEmailHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getNotificationEnvConfig(): NotificationEnvConfig {
  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    telegramChatId: process.env.TELEGRAM_CHAT_ID?.trim() || undefined,
    resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
    fromEmail:
      process.env.NOTIFICATION_FROM_EMAIL?.trim() ||
      'Sport Castle Orders <orders@sportcastle.kh>',
  };
}

export function buildOrderNotificationContent(params: {
  eventType: NotificationEventType;
  order?: Pick<
    Order,
    | 'id'
    | 'status'
    | 'paymentMethod'
    | 'fulfillmentMethod'
    | 'pickupBranch'
    | 'totalUsd'
    | 'totalKhr'
    | 'customer'
    | 'items'
  >;
  rma?: Pick<RmaRequest, 'rmaId' | 'orderId' | 'resolution' | 'totalRefund' | 'reason'>;
  paymentReference?: string | null;
  customMessage?: string;
}): {
  subject: string;
  telegramText: string;
  emailHtml: string;
  customerEmail: string | null;
  orderId: string | null;
} {
  const { eventType, order, rma, paymentReference, customMessage } = params;

  if (eventType === 'admin_test') {
    const body =
      customMessage?.trim() ||
      'Sport Castle production notification pipeline verification ping.';
    const subject = 'Sport Castle Ops — Notification Channel Verification';
    return {
      subject,
      telegramText: `[Sport Castle Ops Test]\n${body}\nTime: ${new Date().toISOString()}`,
      emailHtml: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="margin:0 0 12px;color:#0f172a;">Sport Castle Notification Test</h2>
        <p style="margin:0 0 12px;color:#334155;">${escapeEmailHtml(body)}</p>
        <p style="margin:0;color:#64748b;font-size:12px;">Dispatched from Sport Castle Cambodia Backend</p>
      </div>`,
      customerEmail: null,
      orderId: null,
    };
  }

  if (eventType === 'rma_created' && rma) {
    const subject = `Return Request ${rma.rmaId} Received — Order ${rma.orderId}`;
    const telegramText = [
      `[Sport Castle RMA] ${rma.rmaId}`,
      `Order: ${rma.orderId}`,
      `Resolution: ${rma.resolution}`,
      `Refund Estimate: $${rma.totalRefund.toFixed(2)}`,
      `Reason: ${rma.reason}`,
    ].join('\n');
    const emailHtml = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#0f172a;">Return Label Generated (${escapeEmailHtml(rma.rmaId)})</h2>
      <p style="margin:0 0 8px;color:#334155;">Order ID: <strong>${escapeEmailHtml(rma.orderId)}</strong></p>
      <p style="margin:0 0 8px;color:#334155;">Resolution: <strong>${escapeEmailHtml(rma.resolution)}</strong></p>
      <p style="margin:0 0 8px;color:#334155;">Estimated Refund: <strong>$${rma.totalRefund.toFixed(2)}</strong></p>
      <p style="margin:0;color:#475569;">Reason: ${escapeEmailHtml(rma.reason)}</p>
    </div>`;

    return {
      subject,
      telegramText,
      emailHtml,
      customerEmail: order?.customer.email?.trim() || null,
      orderId: rma.orderId,
    };
  }

  if (!order) {
    return {
      subject: 'Sport Castle Order Update',
      telegramText: 'Sport Castle order update received.',
      emailHtml: '<p>Sport Castle order update received.</p>',
      customerEmail: null,
      orderId: null,
    };
  }

  const itemLines = order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name} (${item.size}) — $${(item.unitPrice * item.quantity).toFixed(2)}`,
    )
    .join('\n');

  const itemHtmlRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;">${escapeEmailHtml(item.name)} (${escapeEmailHtml(item.size)})</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#0f172a;">$${(item.unitPrice * item.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  const headingByEvent: Record<NotificationEventType, string> = {
    order_created: `New Order Confirmed: ${order.id}`,
    payment_confirmed: `Payment Received for Order ${order.id}`,
    status_updated: `Order ${order.id} Status: ${order.status}`,
    rma_created: `Return Request for Order ${order.id}`,
    admin_test: `Sport Castle Ops Test`,
  };

  const subject = `${headingByEvent[eventType]} — Sport Castle Cambodia`;

  const telegramLines = [
    `[${headingByEvent[eventType]}]`,
    `Customer: ${order.customer.fullName} (${order.customer.phone})`,
    `Status: ${order.status}`,
    `Total: $${order.totalUsd.toFixed(2)} (${order.totalKhr.toLocaleString('en-US')} KHR)`,
    `Payment: ${order.paymentMethod.toUpperCase()}${paymentReference ? ` | Ref: ${paymentReference}` : ''}`,
    `Fulfillment: ${order.fulfillmentMethod === 'pickup' ? `Pickup (${order.pickupBranch ?? 'sonthormuk'})` : `Delivery (${order.customer.khan})`}`,
    `Items:\n${itemLines}`,
  ];

  const emailHtml = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
    <h2 style="margin:0 0 12px;color:#0f172a;">${escapeEmailHtml(headingByEvent[eventType])}</h2>
    <p style="margin:0 0 16px;color:#334155;">Hi ${escapeEmailHtml(order.customer.fullName)}, here is the latest update on your Sport Castle order.</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Status:</strong> ${escapeEmailHtml(order.status)}</p>
    <p style="margin:0 0 8px;color:#334155;"><strong>Payment Method:</strong> ${escapeEmailHtml(order.paymentMethod.toUpperCase())}${paymentReference ? ` (Ref: ${escapeEmailHtml(paymentReference)})` : ''}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:12px;">ITEM</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:12px;">QTY</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:12px;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${itemHtmlRows}</tbody>
    </table>
    <p style="margin:12px 0 0;font-size:16px;font-weight:700;color:#0f172a;">Total: $${order.totalUsd.toFixed(2)} (${order.totalKhr.toLocaleString('en-US')} KHR)</p>
  </div>`;

  return {
    subject,
    telegramText: telegramLines.join('\n'),
    emailHtml,
    customerEmail: order.customer.email?.trim() || null,
    orderId: order.id,
  };
}

export async function logNotificationRecord(
  record: NotificationDeliveryResult,
): Promise<void> {
  try {
    await db.insert(notificationLogs).values({
      id: record.id,
      orderId: record.orderId,
      channel: record.channel,
      eventType: record.eventType,
      recipient: record.recipient,
      subject: record.subject,
      status: record.status,
      providerMessageId: record.providerMessageId,
      errorMessage: record.errorMessage,
      sentAt: record.sentAt,
    });
  } catch (error) {
    console.error('[NotificationService] Failed to persist notification log:', error);
  }
}

async function sendTelegramNotification(params: {
  orderId: string | null;
  eventType: NotificationEventType;
  subject: string;
  text: string;
  env: NotificationEnvConfig;
  fetchImpl: FetchLike;
}): Promise<NotificationDeliveryResult> {
  const id = `ntf-tg-${crypto.randomUUID().slice(0, 12)}`;
  const token = params.env.telegramBotToken;
  const chatId = params.env.telegramChatId;

  if (!token || !chatId) {
    return {
      id,
      orderId: params.orderId,
      channel: 'telegram',
      eventType: params.eventType,
      recipient: chatId || 'telegram:unconfigured',
      subject: params.subject,
      status: 'skipped',
      providerMessageId: null,
      errorMessage:
        'Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured.',
      sentAt: null,
    };
  }

  // Fixed Telegram Bot API endpoint (zero user-controlled URL risk)
  const endpoint = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
  try {
    const response = await params.fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.text,
        disable_web_page_preview: true,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      return {
        id,
        orderId: params.orderId,
        channel: 'telegram',
        eventType: params.eventType,
        recipient: chatId,
        subject: params.subject,
        status: 'failed',
        providerMessageId: null,
        errorMessage: `Telegram API HTTP ${response.status}: ${rawBody.slice(0, 200)}`,
        sentAt: null,
      };
    }

    let messageId: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as { result?: { message_id?: number } };
      if (parsed.result?.message_id !== undefined) {
        messageId = String(parsed.result.message_id);
      }
    } catch {
      // Non-JSON response fallback
    }

    return {
      id,
      orderId: params.orderId,
      channel: 'telegram',
      eventType: params.eventType,
      recipient: chatId,
      subject: params.subject,
      status: 'sent',
      providerMessageId: messageId,
      errorMessage: null,
      sentAt: new Date(),
    };
  } catch (error) {
    return {
      id,
      orderId: params.orderId,
      channel: 'telegram',
      eventType: params.eventType,
      recipient: chatId,
      subject: params.subject,
      status: 'failed',
      providerMessageId: null,
      errorMessage: error instanceof Error ? error.message : 'Telegram request failed',
      sentAt: null,
    };
  }
}

async function sendResendEmailNotification(params: {
  orderId: string | null;
  eventType: NotificationEventType;
  recipientEmail: string | null;
  subject: string;
  html: string;
  env: NotificationEnvConfig;
  fetchImpl: FetchLike;
}): Promise<NotificationDeliveryResult> {
  const id = `ntf-em-${crypto.randomUUID().slice(0, 12)}`;
  const apiKey = params.env.resendApiKey;
  const recipient = params.recipientEmail?.trim() || '';

  if (!apiKey) {
    return {
      id,
      orderId: params.orderId,
      channel: 'email',
      eventType: params.eventType,
      recipient: recipient || 'email:unconfigured',
      subject: params.subject,
      status: 'skipped',
      providerMessageId: null,
      errorMessage:
        'Email notification skipped: RESEND_API_KEY is not configured.',
      sentAt: null,
    };
  }

  if (!recipient || !recipient.includes('@')) {
    return {
      id,
      orderId: params.orderId,
      channel: 'email',
      eventType: params.eventType,
      recipient: 'email:missing-recipient',
      subject: params.subject,
      status: 'skipped',
      providerMessageId: null,
      errorMessage: 'Email notification skipped: No valid recipient email provided.',
      sentAt: null,
    };
  }

  // Fixed Resend Email API endpoint (zero user-controlled URL risk)
  const endpoint = 'https://api.resend.com/emails';
  try {
    const response = await params.fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.env.fromEmail || 'Sport Castle Orders <orders@sportcastle.kh>',
        to: [recipient],
        subject: params.subject,
        html: params.html,
      }),
    });

    const rawBody = await response.text();
    if (!response.ok) {
      return {
        id,
        orderId: params.orderId,
        channel: 'email',
        eventType: params.eventType,
        recipient,
        subject: params.subject,
        status: 'failed',
        providerMessageId: null,
        errorMessage: `Resend API HTTP ${response.status}: ${rawBody.slice(0, 200)}`,
        sentAt: null,
      };
    }

    let messageId: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as { id?: string };
      if (parsed.id) {
        messageId = parsed.id;
      }
    } catch {
      // Non-JSON response fallback
    }

    return {
      id,
      orderId: params.orderId,
      channel: 'email',
      eventType: params.eventType,
      recipient,
      subject: params.subject,
      status: 'sent',
      providerMessageId: messageId,
      errorMessage: null,
      sentAt: new Date(),
    };
  } catch (error) {
    return {
      id,
      orderId: params.orderId,
      channel: 'email',
      eventType: params.eventType,
      recipient,
      subject: params.subject,
      status: 'failed',
      providerMessageId: null,
      errorMessage: error instanceof Error ? error.message : 'Resend request failed',
      sentAt: null,
    };
  }
}

export async function dispatchOrderNotifications(params: {
  eventType: NotificationEventType;
  order?: Pick<
    Order,
    | 'id'
    | 'status'
    | 'paymentMethod'
    | 'fulfillmentMethod'
    | 'pickupBranch'
    | 'totalUsd'
    | 'totalKhr'
    | 'customer'
    | 'items'
  >;
  rma?: Pick<RmaRequest, 'rmaId' | 'orderId' | 'resolution' | 'totalRefund' | 'reason'>;
  recipientEmailOverride?: string | null;
  paymentReference?: string | null;
  customMessage?: string;
  env?: NotificationEnvConfig;
  fetchImpl?: FetchLike;
  persistLog?: PersistNotificationLogFn;
}): Promise<NotificationDeliveryResult[]> {
  const env = params.env ?? getNotificationEnvConfig();
  const fetchImpl: FetchLike = params.fetchImpl ?? (globalThis.fetch as FetchLike);
  const persistLog = params.persistLog ?? logNotificationRecord;

  const content = buildOrderNotificationContent({
    eventType: params.eventType,
    order: params.order,
    rma: params.rma,
    paymentReference: params.paymentReference,
    customMessage: params.customMessage,
  });

  const targetEmail = params.recipientEmailOverride ?? content.customerEmail;

  const results = await Promise.all([
    sendTelegramNotification({
      orderId: content.orderId,
      eventType: params.eventType,
      subject: content.subject,
      text: content.telegramText,
      env,
      fetchImpl,
    }),
    sendResendEmailNotification({
      orderId: content.orderId,
      eventType: params.eventType,
      recipientEmail: targetEmail,
      subject: content.subject,
      html: content.emailHtml,
      env,
      fetchImpl,
    }),
  ]);

  await Promise.all(results.map((record) => persistLog(record)));
  return results;
}

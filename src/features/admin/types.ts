/**
 * Admin API shapes. The admin routes are not in the public OpenAPI file, so these are written by hand from
 * sport-backend/src/modules/admin/*, orders/adminRouter.ts, questions/router.ts and rma/router.ts.
 */
import type { OrderView } from '../orders/api';

export type Role = 'customer' | 'staff' | 'admin';
export type OrderStatus = OrderView['status'];

export interface Overview {
  today: { orders: number; paidOrders: number; revenueCents: number };
  pendingPayments: number;
  needsRefund: number;
  awaitingFulfilment: { confirmed: number; printing: number; readyForPickup: number; outForDelivery: number };
  openReturns: number;
  pendingQuestions: number;
  lowStockRows: number;
  needsCountRows: number;
  outboxFailed: number;
  branch: string | null;
}

export interface AdminOrderRow {
  number: string;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  paymentMethod: string;
  fulfillment: 'delivery' | 'pickup';
  contactName: string;
  contactPhone: string;
  totalCents: number;
  needsRefund: boolean;
  branches: string[];
  createdAt: string;
}
export interface AdminOrderList {
  orders: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminOrderEvent {
  at: string;
  from: OrderStatus | null;
  to: OrderStatus | null;
  kind: string;
  actor: string;
  actorName: string | null;
  note: string | null;
}
export interface AdminOrderDetail {
  order: OrderView;
  needsRefund: boolean;
  events: AdminOrderEvent[];
  payments: { attempt: number; method: string; status: string; amountCents: number; tranId: string; createdAt: string; updatedAt: string }[];
  allocations: { orderItemId: string; branchId: string; qty: number }[];
  pickList: Record<string, { sku: string; name: string; size: string; color: string; qty: number; customPrint: { name: string; number: number; patch: string; font: string } | null }[]>;
}

export interface LookupVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  branchId: string;
  onHand: number;
  reserved: number;
  available: number;
}
export interface Lookup {
  branchId: string;
  products: { id: string; slug: string; name: string; variants: LookupVariant[] }[];
}
export interface StockRow {
  variantId: string;
  sku: string;
  size: string;
  branchId: string;
  onHand: number;
  reserved: number;
  onlineBuffer: number | null;
  needsCount: boolean;
  updatedAt: string;
}
export interface Movement {
  id: string;
  branchId: string;
  deltaOnHand: number;
  deltaReserved: number;
  reason: string;
  refId: string | null;
  note: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export type I18n = { en: string; km?: string };
export interface AdminProductRow {
  id: string;
  slug: string;
  brandId: string;
  categoryId: string;
  nameI18n: I18n;
  status: 'draft' | 'active' | 'archived';
  isCustomizable: boolean;
  updatedAt: string;
}
export interface AdminVariant {
  id: string;
  colorId: string;
  sizeLabel: string;
  sizeSort: number;
  sku: string;
  priceCents: number;
  compareAtCents: number | null;
  status: 'active' | 'inactive';
}
export interface AdminProduct extends AdminProductRow {
  shortNameI18n: I18n | null;
  descriptionI18n: I18n | null;
  highlights: string[];
  specs: Record<string, string>;
  attributes: Record<string, unknown>;
  flags: Record<string, boolean>;
  heroTagline: string | null;
  colors: { id: string; name: string; swatchHex: string | null; sort: number }[];
  variants: AdminVariant[];
  images: { id: string; colorId: string | null; path: string; url?: string | null; alt: string | null; sort: number }[];
}
export interface Brand {
  id: string;
  slug: string;
  name: string;
}
export interface Category {
  id: string;
  slug: string;
  nameI18n: I18n;
}
export interface CsvImportResult {
  applied: boolean;
  changes: { sku: string; field: string; from: unknown; to: unknown }[];
  errors?: { line: number; message: string }[];
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  minSubtotalCents: number;
  scope: { categories?: string[]; brands?: string[]; methods?: string[] };
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  active: boolean;
  createdAt: string;
}
export interface ShippingRate {
  id: string;
  methodId: string;
  provinceCode: string | null;
  feeCents: number;
  freeOverCents: number | null;
  etaI18n: I18n;
  needsReview: boolean;
}

export interface AdminUser {
  id: string;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  role: Role;
  staffBranchId: string | null;
  phoneVerified: boolean;
  createdAt: string;
}
export interface AdminQuestion {
  id: string;
  productSlug: string;
  productName: string;
  authorName: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'published' | 'hidden';
  fromMember: boolean;
  answeredAt: string | null;
  createdAt: string;
}
export interface AdminReturn {
  number: string;
  orderNumber: string;
  resolution: 'refund' | 'size_exchange' | 'store_credit';
  status: 'requested' | 'approved' | 'rejected';
  refundCents: number;
  note: string | null;
  items: { orderItemId: string; name: string; size: string; qty: number; reason: string; refundCents: number; exchangeSize: string | null }[];
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
}
export interface NotificationRow {
  id: number;
  channel: string;
  recipient: string;
  template: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  nextAttemptAt: string | null;
}
export interface WebhookRow {
  id: number;
  provider: string;
  eventId: string;
  signatureValid: boolean;
  processingStatus: 'received' | 'processed' | 'ignored' | 'rejected' | 'failed';
  tranId: string | null;
  error: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface SalesTotals {
  paidOrders: number;
  revenueCents: number;
  averageOrderCents: number;
}

export interface Sales {
  days: { date: string; paidOrders: number; revenueCents: number }[];
  totals: SalesTotals;
  previous: SalesTotals;
  topProducts: { productId: string; name: string; imageUrl: string | null; qty: number; revenueCents: number }[];
  byCategory: { slug: string; name: string; revenueCents: number }[];
  branch: string | null;
}

/** A row of the admin product list: the product plus what a manager needs at a glance. */
export interface AdminProductListRow extends AdminProductRow {
  brandName?: string;
  categorySlug?: string;
  imageUrl?: string | null;
  hoverImageUrl?: string | null;
  imageCount?: number;
  priceMinCents?: number | null;
  priceMaxCents?: number | null;
  variantCount?: number;
  onHand?: number;
}

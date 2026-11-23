import { getFirebaseIdToken } from './firebase';
import type { CatalogProduct } from './mock-store/catalog';
import type {
  MemberProfile,
  Order,
  Product,
  ProductQuestion,
  RmaRequest,
  SavedAddress,
  SavedPaymentMethod,
  StockLevel,
} from '../types/store';

export interface AccountBootstrapResponse {
  profile: MemberProfile;
  addresses: SavedAddress[];
  savedPayments: SavedPaymentMethod[];
  wishlist: string[];
  orders: Order[];
  rmaRequests: RmaRequest[];
}

export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface AdminOverviewStats {
  totalOrders: number;
  paidOrders: number;
  pendingPayments: number;
  activeFulfillmentOrders: number;
  paidRevenueUsd: number;
  totalCatalogRevenueUsd: number;
  inventoryOverridesCount: number;
  archivedProductsCount: number;
  webhookEventsCount: number;
  notificationsSentCount: number;
  notificationsFailedCount: number;
}

export interface AdminOrderRecord extends Order {
  userUid: string | null;
  customerEmail: string;
  paymentStatus: OrderPaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
}

export interface InventoryOverrideRecord {
  productId: string;
  priceUsd: number | null;
  originalPriceUsd: number | null;
  sonthormukStock: StockLevel | null;
  sensokStock: StockLevel | null;
  chomkadongStock: StockLevel | null;
  unitsAvailable: number | null;
  isArchived: boolean;
  updatedByUid: string | null;
  updatedAt: string;
}

export interface AdminInventoryItem {
  product: Product;
  override: InventoryOverrideRecord | null;
  unitsAvailable: number | null;
  isArchived: boolean;
}

export interface WebhookEventAuditRecord {
  id: number;
  provider: string;
  providerEventId: string;
  eventType: string;
  orderId: string | null;
  amountUsd: number | null;
  currency: string;
  signatureValid: boolean;
  processingStatus: string;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface NotificationAuditRecord {
  id: string;
  orderId: string | null;
  channel: string;
  eventType: string;
  recipient: string;
  subject: string;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = await getFirebaseIdToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (options.requireAuth) {
    throw new ApiRequestError('Authentication required', 401);
  }

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) errorMessage = payload.error;
    } catch {
      // keep generic status error
    }
    throw new ApiRequestError(errorMessage, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchLiveCatalogApi(): Promise<CatalogProduct[]> {
  const data = await apiRequest<{ products: CatalogProduct[] }>('/catalog');
  return data.products;
}

export async function fetchAccountBootstrap(): Promise<AccountBootstrapResponse> {
  return apiRequest<AccountBootstrapResponse>('/account/bootstrap', {
    requireAuth: true,
  });
}

export async function updateProfileApi(
  patch: Partial<MemberProfile>,
): Promise<MemberProfile> {
  const data = await apiRequest<{ profile: MemberProfile }>('/account/profile', {
    method: 'PUT',
    body: patch,
    requireAuth: true,
  });
  return data.profile;
}

export async function createAddressApi(
  addr: Omit<SavedAddress, 'id'>,
): Promise<SavedAddress> {
  const data = await apiRequest<{ address: SavedAddress }>('/account/addresses', {
    method: 'POST',
    body: addr,
    requireAuth: true,
  });
  return data.address;
}

export async function updateAddressApi(
  id: string,
  patch: Partial<SavedAddress>,
): Promise<SavedAddress> {
  const data = await apiRequest<{ address: SavedAddress }>(
    `/account/addresses/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: patch,
      requireAuth: true,
    },
  );
  return data.address;
}

export async function deleteAddressApi(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(
    `/account/addresses/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      requireAuth: true,
    },
  );
}

export async function createPaymentApi(
  pm: Omit<SavedPaymentMethod, 'id' | 'vaultToken'>,
): Promise<SavedPaymentMethod> {
  const data = await apiRequest<{ payment: SavedPaymentMethod }>(
    '/account/payments',
    {
      method: 'POST',
      body: pm,
      requireAuth: true,
    },
  );
  return data.payment;
}

export async function setDefaultPaymentApi(id: string): Promise<void> {
  await apiRequest<{ updated: boolean }>(
    `/account/payments/${encodeURIComponent(id)}/default`,
    {
      method: 'PATCH',
      requireAuth: true,
    },
  );
}

export async function deletePaymentApi(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(
    `/account/payments/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      requireAuth: true,
    },
  );
}

export async function syncWishlistApi(productIds: string[]): Promise<string[]> {
  const data = await apiRequest<{ productIds: string[] }>('/account/wishlist', {
    method: 'PUT',
    body: { productIds },
    requireAuth: true,
  });
  return data.productIds;
}

export async function createOrderApi(order: Order): Promise<Order> {
  const data = await apiRequest<{ order: Order }>('/orders', {
    method: 'POST',
    body: order,
  });
  return data.order;
}

export async function trackOrderApi(
  orderId: string,
  email: string,
): Promise<Order | null> {
  try {
    const data = await apiRequest<{ order: Order }>('/orders/track', {
      method: 'POST',
      body: { orderId, email },
    });
    return data.order;
  } catch {
    return null;
  }
}

export async function createRmaApi(
  payload: Omit<RmaRequest, 'rmaId' | 'createdAt' | 'labelCode' | 'status'>,
): Promise<RmaRequest> {
  const data = await apiRequest<{ rmaRequest: RmaRequest }>('/rma', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
  return data.rmaRequest;
}

export async function fetchQuestionsApi(): Promise<ProductQuestion[]> {
  const data = await apiRequest<{ questions: ProductQuestion[] }>('/questions');
  return data.questions;
}

export async function createQuestionApi(payload: {
  productId: string;
  author: string;
  question: string;
}): Promise<ProductQuestion> {
  const data = await apiRequest<{ question: ProductQuestion }>('/questions', {
    method: 'POST',
    body: payload,
  });
  return data.question;
}

// ---------------------------------------------------------------------------
// Admin Operations API (Server-Side Firebase Auth + Cloud SQL RBAC)
// ---------------------------------------------------------------------------

export async function fetchAdminOverviewApi(): Promise<AdminOverviewStats> {
  const data = await apiRequest<{ overview: AdminOverviewStats }>(
    '/admin/overview',
    { requireAuth: true },
  );
  return data.overview;
}

export async function fetchAdminOrdersApi(filters?: {
  status?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<AdminOrderRecord[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
    params.set('paymentStatus', filters.paymentStatus);
  }
  if (filters?.limit) {
    params.set('limit', String(filters.limit));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest<{ orders: AdminOrderRecord[] }>(
    `/admin/orders${suffix}`,
    { requireAuth: true },
  );
  return data.orders;
}

export async function updateAdminOrderStatusApi(
  orderId: string,
  patch: {
    status?: Order['status'];
    paymentStatus?: OrderPaymentStatus;
    paymentReference?: string;
  },
): Promise<AdminOrderRecord> {
  const data = await apiRequest<{ order: AdminOrderRecord }>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: patch,
      requireAuth: true,
    },
  );
  return data.order;
}

export async function fetchAdminInventoryApi(): Promise<{
  items: AdminInventoryItem[];
  total: number;
  overridesCount: number;
  archivedCount: number;
}> {
  return apiRequest('/admin/inventory', { requireAuth: true });
}

export async function upsertAdminInventoryApi(
  productId: string,
  input: {
    priceUsd?: number | null;
    originalPriceUsd?: number | null;
    sonthormukStock?: StockLevel | null;
    sensokStock?: StockLevel | null;
    chomkadongStock?: StockLevel | null;
    unitsAvailable?: number | null;
    isArchived?: boolean;
  },
): Promise<{ override: InventoryOverrideRecord; product: Product }> {
  return apiRequest(`/admin/inventory/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: input,
    requireAuth: true,
  });
}

export async function deleteAdminInventoryApi(productId: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(
    `/admin/inventory/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      requireAuth: true,
    },
  );
}

export async function fetchAdminWebhooksApi(
  limit = 50,
): Promise<WebhookEventAuditRecord[]> {
  const data = await apiRequest<{ events: WebhookEventAuditRecord[] }>(
    `/admin/webhooks?limit=${limit}`,
    { requireAuth: true },
  );
  return data.events;
}

export async function fetchAdminNotificationsApi(
  limit = 50,
): Promise<NotificationAuditRecord[]> {
  const data = await apiRequest<{ notifications: NotificationAuditRecord[] }>(
    `/admin/notifications?limit=${limit}`,
    { requireAuth: true },
  );
  return data.notifications;
}

export async function sendAdminTestNotificationApi(payload: {
  recipientEmail?: string;
  message?: string;
}): Promise<NotificationAuditRecord[]> {
  const data = await apiRequest<{ deliveries: NotificationAuditRecord[] }>(
    '/admin/notifications/test',
    {
      method: 'POST',
      body: payload,
      requireAuth: true,
    },
  );
  return data.deliveries;
}

export async function fetchSystemHealthMetricsApi(params?: {
  limit?: number;
  thresholdMs?: number;
  probe?: boolean;
}): Promise<
  import('../../backend/health/systemHealthTypes').SystemHealthMetricsResponse
> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params?.thresholdMs !== undefined) {
    query.set('thresholdMs', String(params.thresholdMs));
  }
  if (params?.probe !== undefined) {
    query.set('probe', params.probe ? 'true' : 'false');
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<
    import('../../backend/health/systemHealthTypes').SystemHealthMetricsResponse
  >(`/system-health/metrics${suffix}`, {
    method: 'GET',
    requireAuth: false,
  });
}


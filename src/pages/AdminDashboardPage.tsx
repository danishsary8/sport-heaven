import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  Box,
  Check,
  CreditCard,
  LayoutDashboard,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  ApiRequestError,
  deleteAdminInventoryApi,
  fetchAdminInventoryApi,
  fetchAdminNotificationsApi,
  fetchAdminOrdersApi,
  fetchAdminOverviewApi,
  fetchAdminWebhooksApi,
  sendAdminTestNotificationApi,
  updateAdminOrderStatusApi,
  upsertAdminInventoryApi,
  type AdminInventoryItem,
  type AdminOrderRecord,
  type AdminOverviewStats,
  type NotificationAuditRecord,
  type OrderPaymentStatus,
  type WebhookEventAuditRecord,
} from '../lib/apiClient';
import type { AdminTab, Order, StockLevel } from '../types/store';
import { DatabaseLatencyChart } from '../components/admin/DatabaseLatencyChart';

const ORDER_STATUSES: Order['status'][] = [
  'Confirmed',
  'Heat-Press Printing',
  'Rider Dispatched',
  'Delivered',
];

const PAYMENT_STATUSES: OrderPaymentStatus[] = [
  'pending',
  'paid',
  'failed',
  'refunded',
];

const STOCK_LEVELS: StockLevel[] = [
  'In Stock',
  'Limited Stock',
  'Out of Stock',
];

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventory & Pricing', icon: Box },
  { id: 'latency', label: 'Database Latency', icon: Activity },
  { id: 'webhooks', label: 'Payment Webhooks', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function formatUsdAmount(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface InventoryDraft {
  priceUsd: string;
  originalPriceUsd: string;
  sonthormukStock: StockLevel;
  sensokStock: StockLevel;
  chomkadongStock: StockLevel;
  unitsAvailable: string;
  isArchived: boolean;
}

export function AdminDashboardPage({ initialTab }: { initialTab?: AdminTab }) {
  const {
    isGoogleAuthenticated,
    firebaseUserEmail,
    signInWithGoogle,
    logoutMember,
    navigate,
    pushToast,
    refreshLiveCatalog,
  } = useStore();

  const activeTab: AdminTab = initialTab ?? 'overview';

  const [authState, setAuthState] = useState<
    'checking' | 'unauthenticated' | 'forbidden' | 'authorized' | 'error'
  >('checking');
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<AdminInventoryItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEventAuditRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationAuditRecord[]>(
    [],
  );

  // Orders filter & inline draft state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [orderDrafts, setOrderDrafts] = useState<
    Record<
      string,
      {
        status: Order['status'];
        paymentStatus: OrderPaymentStatus;
      }
    >
  >({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  // Inventory search, category filter & inline editor state
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('all');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [inventoryDraft, setInventoryDraft] = useState<InventoryDraft | null>(
    null,
  );
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Test notification form state
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testMessage, setTestMessage] = useState(
    'Sport Castle Cambodia live admin verification alert.',
  );
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!isGoogleAuthenticated) {
      setAuthState('unauthenticated');
      return;
    }

    setIsRefreshing(true);
    setAuthErrorMessage('');
    try {
      const overviewStats = await fetchAdminOverviewApi();
      setOverview(overviewStats);
      setAuthState('authorized');

      const [ordersData, inventoryData, webhooksData, notificationsData] =
        await Promise.all([
          fetchAdminOrdersApi({ limit: 100 }),
          fetchAdminInventoryApi(),
          fetchAdminWebhooksApi(50),
          fetchAdminNotificationsApi(50),
        ]);

      setOrders(ordersData);
      setInventoryItems(inventoryData.items);
      setWebhooks(webhooksData);
      setNotifications(notificationsData);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 401) {
          setAuthState('unauthenticated');
        } else if (error.status === 403) {
          setAuthState('forbidden');
          setAuthErrorMessage(error.message);
        } else {
          setAuthState('error');
          setAuthErrorMessage(error.message);
        }
      } else {
        setAuthState('error');
        setAuthErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load admin data from server.',
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isGoogleAuthenticated]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (firebaseUserEmail && !testRecipientEmail) {
      setTestRecipientEmail(firebaseUserEmail);
    }
  }, [firebaseUserEmail, testRecipientEmail]);

  const setActiveTab = (tab: AdminTab) => {
    navigate({ page: 'admin', tab });
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) {
        return false;
      }
      if (
        orderPaymentFilter !== 'all' &&
        order.paymentStatus !== orderPaymentFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        order.id.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q) ||
        order.customer.fullName.toLowerCase().includes(q) ||
        (order.paymentReference ?? '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, orderStatusFilter, orderPaymentFilter]);

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      if (
        inventoryCategory !== 'all' &&
        item.product.category !== inventoryCategory
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.product.name.toLowerCase().includes(q) ||
        item.product.brand.toLowerCase().includes(q) ||
        item.product.id.toLowerCase().includes(q)
      );
    });
  }, [inventoryItems, inventorySearch, inventoryCategory]);

  const handleSaveOrder = async (order: AdminOrderRecord) => {
    const draft = orderDrafts[order.id];
    if (!draft) return;

    setSavingOrderId(order.id);
    try {
      const updated = await updateAdminOrderStatusApi(order.id, {
        status: draft.status,
        paymentStatus: draft.paymentStatus,
      });
      setOrders((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setOrderDrafts((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      const latestOverview = await fetchAdminOverviewApi();
      setOverview(latestOverview);
      const latestNotifications = await fetchAdminNotificationsApi(50);
      setNotifications(latestNotifications);
      pushToast(`Order ${updated.id} updated to ${updated.status}`);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Failed to update order',
      );
    } finally {
      setSavingOrderId(null);
    }
  };

  const openInventoryEditor = (item: AdminInventoryItem) => {
    setEditingProductId(item.product.id);
    setInventoryDraft({
      priceUsd: String(item.product.price),
      originalPriceUsd:
        item.product.originalPrice !== undefined
          ? String(item.product.originalPrice)
          : '',
      sonthormukStock: item.product.branchStock.sonthormuk,
      sensokStock: item.product.branchStock.sensok,
      chomkadongStock: item.product.branchStock.chomkadong,
      unitsAvailable:
        item.unitsAvailable !== null ? String(item.unitsAvailable) : '',
      isArchived: item.isArchived,
    });
  };

  const handleSaveInventory = async (productId: string) => {
    if (!inventoryDraft) return;
    const parsedPrice = Number(inventoryDraft.priceUsd);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      pushToast('Enter a valid price in USD.');
      return;
    }

    const parsedOriginal =
      inventoryDraft.originalPriceUsd.trim() === ''
        ? null
        : Number(inventoryDraft.originalPriceUsd);
    if (
      parsedOriginal !== null &&
      (!Number.isFinite(parsedOriginal) || parsedOriginal < 0)
    ) {
      pushToast('Enter a valid original price or leave it blank.');
      return;
    }

    const parsedUnits =
      inventoryDraft.unitsAvailable.trim() === ''
        ? null
        : Math.floor(Number(inventoryDraft.unitsAvailable));
    if (
      parsedUnits !== null &&
      (!Number.isFinite(parsedUnits) || parsedUnits < 0)
    ) {
      pushToast('Enter a valid non-negative stock unit count.');
      return;
    }

    setSavingProductId(productId);
    try {
      const saved = await upsertAdminInventoryApi(productId, {
        priceUsd: parsedPrice,
        originalPriceUsd: parsedOriginal,
        sonthormukStock: inventoryDraft.sonthormukStock,
        sensokStock: inventoryDraft.sensokStock,
        chomkadongStock: inventoryDraft.chomkadongStock,
        unitsAvailable: parsedUnits,
        isArchived: inventoryDraft.isArchived,
      });

      setInventoryItems((prev) =>
        prev.map((item) =>
          item.product.id === productId
            ? {
                product: saved.product,
                override: saved.override,
                unitsAvailable: saved.override.unitsAvailable,
                isArchived: saved.override.isArchived,
              }
            : item,
        ),
      );
      setEditingProductId(null);
      setInventoryDraft(null);
      await Promise.all([
        refreshLiveCatalog(),
        fetchAdminOverviewApi().then(setOverview),
      ]);
      pushToast(`Saved live pricing & stock for ${saved.product.shortName}`);
    } catch (error) {
      pushToast(
        error instanceof Error
          ? error.message
          : 'Failed to save inventory override',
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const handleResetInventoryOverride = async (productId: string) => {
    setSavingProductId(productId);
    try {
      await deleteAdminInventoryApi(productId);
      const [refreshedInventory, refreshedOverview] = await Promise.all([
        fetchAdminInventoryApi(),
        fetchAdminOverviewApi(),
        refreshLiveCatalog(),
      ]);
      setInventoryItems(refreshedInventory.items);
      setOverview(refreshedOverview);
      setEditingProductId(null);
      setInventoryDraft(null);
      pushToast('Restored catalog defaults for product');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Failed to reset override',
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    try {
      const deliveries = await sendAdminTestNotificationApi({
        recipientEmail: testRecipientEmail.trim() || undefined,
        message: testMessage.trim() || undefined,
      });
      const latestLogs = await fetchAdminNotificationsApi(50);
      setNotifications(latestLogs);
      const sentCount = deliveries.filter((d) => d.status === 'sent').length;
      const skippedCount = deliveries.filter(
        (d) => d.status === 'skipped',
      ).length;
      pushToast(
        sentCount > 0
          ? `Test notification dispatched (${sentCount} sent, ${skippedCount} skipped)`
          : 'Test logged as skipped until Telegram/Resend secrets are configured',
      );
    } catch (error) {
      pushToast(
        error instanceof Error
          ? error.message
          : 'Failed to dispatch test notification',
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  // Gate 1: Unauthenticated
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-[78vh] bg-[#F4F2EC] py-16">
        <div className="mx-auto max-w-[640px] px-4 sm:px-6">
          <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-8 sm:p-10">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#0E1113]/60">
              <Lock className="h-4 w-4 shrink-0 text-[#C8232C]" />
              <span className="whitespace-nowrap">Sport Castle Operations</span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">Protected Console</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-[#0E1113] sm:text-4xl">
              Administrator Sign-In Required
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#0E1113]/70">
              Every order, pricing, inventory, webhook, and notification action
              in this console is protected by Firebase Authentication and
              server-side Cloud SQL role verification.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  const ok = await signInWithGoogle();
                  if (ok) {
                    void loadAdminData();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 bg-[#0E1113] px-5 py-3 text-xs font-semibold tracking-wide text-[#FDFCF9] transition hover:bg-[#C8232C] cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'login' })}
                className="inline-flex items-center justify-center gap-2 border border-[#0E1113]/20 bg-[#F4F2EC] px-5 py-3 text-xs font-semibold tracking-wide text-[#0E1113] transition hover:border-[#0E1113] cursor-pointer whitespace-nowrap"
              >
                Sign In with Email &amp; Password
              </button>
            </div>
            <div className="mt-6 border-t border-[#0E1113]/10 pt-5">
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0E1113]/65 hover:text-[#0E1113] cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to Storefront
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Authenticated non-admin (403)
  if (authState === 'forbidden') {
    return (
      <div className="min-h-[78vh] bg-[#F4F2EC] py-16">
        <div className="mx-auto max-w-[640px] px-4 sm:px-6">
          <div className="border border-[#C8232C]/25 bg-[#FDFCF9] p-8 sm:p-10">
            <div className="flex items-center gap-2 text-xs font-medium text-[#C8232C]">
              <ShieldAlert className="h-4 w-4" />
              <span>Access Restricted (403)</span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
              Administrator Role Required
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#0E1113]/75">
              You are signed in as{' '}
              <strong className="text-[#0E1113]">
                {firebaseUserEmail ?? 'a member account'}
              </strong>
              , which does not currently hold administrator access.{' '}
              {authErrorMessage}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  logoutMember();
                  navigate({ page: 'login' });
                }}
                className="inline-flex items-center justify-center bg-[#0E1113] px-5 py-3 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] cursor-pointer whitespace-nowrap"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'home' })}
                className="inline-flex items-center justify-center border border-[#0E1113]/20 bg-[#F4F2EC] px-5 py-3 text-xs font-semibold text-[#0E1113] transition hover:border-[#0E1113] cursor-pointer whitespace-nowrap"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTabLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';

  return (
    <div className="min-h-[82vh] bg-[#F4F2EC] text-[#0E1113]">
      {/* Top Operations Header Bar */}
      <div className="border-b border-[#0E1113]/15 bg-[#FDFCF9]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-2 text-xs text-[#0E1113]/65">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="hover:text-[#0E1113] cursor-pointer whitespace-nowrap"
            >
              Sport Castle
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#0E1113] whitespace-nowrap">
              Admin Console
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-[#0E1113]/85 whitespace-nowrap">
              {currentTabLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {firebaseUserEmail && (
              <span className="hidden text-xs text-[#0E1113]/60 md:inline">
                {firebaseUserEmail}
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate({ page: 'system-health' })}
              className="inline-flex items-center gap-1.5 border border-[#0E1113]/15 bg-[#F4F2EC] px-3 py-2 text-xs font-medium text-[#0E1113] transition hover:border-[#0E1113] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Activity className="h-3.5 w-3.5" />
              System Health
            </button>
            <button
              type="button"
              onClick={() => void loadAdminData()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Canvas: Sidebar + Content Viewport */}
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Sidebar Navigation */}
        <aside className="border-b border-[#0E1113]/15 bg-[#FDFCF9] p-4 lg:min-h-[75vh] lg:border-r lg:border-b-0 lg:p-6">
          <div className="mb-4 hidden lg:block">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-[#0E1113]">
              Store Operations
            </h2>
            <p className="mt-1 text-xs text-[#0E1113]/60">
              Live Cloud SQL management
            </p>
          </div>
          <nav
            aria-label="Admin sections"
            className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0E1113] text-[#FDFCF9]'
                      : 'text-[#0E1113]/75 hover:bg-[#F4F2EC] hover:text-[#0E1113]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active Panel */}
        <section className="p-4 sm:p-6 lg:p-10">
          {authState === 'checking' && (
            <div className="space-y-4">
              <div className="h-8 w-56 animate-pulse bg-[#0E1113]/10" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-28 animate-pulse border border-[#0E1113]/10 bg-[#FDFCF9]"
                  />
                ))}
              </div>
            </div>
          )}

          {authState === 'error' && (
            <div className="border border-[#C8232C]/25 bg-[#FDFCF9] p-6">
              <p className="text-sm font-semibold text-[#C8232C]">
                Could not load Admin Operations data
              </p>
              <p className="mt-1 text-xs text-[#0E1113]/70">
                {authErrorMessage}
              </p>
              <button
                type="button"
                onClick={() => void loadAdminData()}
                className="mt-4 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] hover:bg-[#C8232C] cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {authState === 'authorized' && overview && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Operations Overview
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Real-time order revenue, fulfillment queues, catalog
                      overrides, and outbound notification telemetry.
                    </p>
                  </div>

                  {/* 4-Column Metric Strip */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
                      <p className="text-xs font-medium text-[#0E1113]/60">
                        Paid Revenue
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0E1113]">
                        {formatUsdAmount(overview.paidRevenueUsd)}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-[#0E1113]/55">
                        {overview.paidOrders} paid · {overview.pendingPayments}{' '}
                        pending
                      </p>
                    </div>

                    <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
                      <p className="text-xs font-medium text-[#0E1113]/60">
                        Total Orders
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0E1113]">
                        {overview.totalOrders}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-[#0E1113]/55">
                        {overview.activeFulfillmentOrders} active in fulfillment
                      </p>
                    </div>

                    <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
                      <p className="text-xs font-medium text-[#0E1113]/60">
                        Catalog Overrides
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0E1113]">
                        {overview.inventoryOverridesCount}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-[#0E1113]/55">
                        {overview.archivedProductsCount} archived SKUs hidden
                      </p>
                    </div>

                    <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
                      <p className="text-xs font-medium text-[#0E1113]/60">
                        Automation Audit
                      </p>
                      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#0E1113]">
                        {overview.webhookEventsCount}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-[#0E1113]/55">
                        Webhooks · {overview.notificationsSentCount} alerts sent
                      </p>
                    </div>
                  </div>

                  {/* Live Cloud SQL Latency Trend Chart */}
                  <DatabaseLatencyChart
                    compact
                    defaultPollSeconds={15}
                    headerAction={{
                      label: 'Full Latency Monitor',
                      onClick: () => setActiveTab('latency'),
                    }}
                  />

                  {/* Quick Navigation Table */}
                  <div className="border border-[#0E1113]/15 bg-[#FDFCF9]">
                    <div className="flex items-center justify-between border-b border-[#0E1113]/10 px-5 py-4">
                      <h2 className="text-sm font-semibold text-[#0E1113]">
                        Recent Orders
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-semibold text-[#C8232C] hover:underline cursor-pointer"
                      >
                        Manage All Orders
                      </button>
                    </div>
                    {orders.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm font-medium text-[#0E1113]">
                          No orders recorded in Cloud SQL yet
                        </p>
                        <p className="mt-1 text-xs text-[#0E1113]/60">
                          New checkout orders placed on the storefront appear
                          here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#0E1113]/10 text-[#0E1113]/60">
                            <tr>
                              <th className="px-5 py-3 font-medium">Order</th>
                              <th className="px-5 py-3 font-medium">Customer</th>
                              <th className="px-5 py-3 font-medium">Fulfillment</th>
                              <th className="px-5 py-3 font-medium">Payment</th>
                              <th className="px-5 py-3 text-right font-medium">
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0E1113]/10">
                            {orders.slice(0, 6).map((order) => (
                              <tr
                                key={order.id}
                                className="hover:bg-[#F4F2EC]/60"
                              >
                                <td className="px-5 py-3 font-mono font-semibold text-[#0E1113]">
                                  {order.id}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="font-medium text-[#0E1113]">
                                    {order.customer.fullName}
                                  </div>
                                  <div className="text-[11px] text-[#0E1113]/55">
                                    {order.customerEmail}
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-[#0E1113]/85">
                                  {order.status}
                                </td>
                                <td className="px-5 py-3 font-mono uppercase text-[#0E1113]/80">
                                  {order.paymentStatus}
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-[#0E1113]">
                                  {formatUsdAmount(order.totalUsd)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS MANAGEMENT */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Order Management
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Update fulfillment stages and payment settlement statuses
                      directly in Cloud SQL. Saving triggers automated customer
                      and ops notifications.
                    </p>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center gap-3 border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#0E1113]/45" />
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search by Order ID, customer name, or email..."
                        className="w-full border border-[#0E1113]/15 bg-[#F4F2EC] py-2 pr-3 pl-9 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                      />
                    </div>
                    <select
                      aria-label="Filter by fulfillment status"
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="border border-[#0E1113]/15 bg-[#F4F2EC] px-3 py-2 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                    >
                      <option value="all">All Fulfillment Stages</option>
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by payment status"
                      value={orderPaymentFilter}
                      onChange={(e) => setOrderPaymentFilter(e.target.value)}
                      className="border border-[#0E1113]/15 bg-[#F4F2EC] px-3 py-2 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                    >
                      <option value="all">All Payment Statuses</option>
                      {PAYMENT_STATUSES.map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Orders Table */}
                  <div className="border border-[#0E1113]/15 bg-[#FDFCF9]">
                    {filteredOrders.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-sm font-medium text-[#0E1113]">
                          No orders match the current filters
                        </p>
                        <p className="mt-1 text-xs text-[#0E1113]/60">
                          Try clearing the search query or place a test checkout
                          order from the storefront.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#0E1113]/15 text-[#0E1113]/60">
                            <tr>
                              <th className="px-4 py-3 font-medium">Order / Date</th>
                              <th className="px-4 py-3 font-medium">Customer</th>
                              <th className="px-4 py-3 font-medium">Items</th>
                              <th className="px-4 py-3 font-medium">
                                Fulfillment Status
                              </th>
                              <th className="px-4 py-3 font-medium">
                                Payment Status
                              </th>
                              <th className="px-4 py-3 text-right font-medium">
                                Total
                              </th>
                              <th className="px-4 py-3 text-right font-medium">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0E1113]/10">
                            {filteredOrders.map((order) => {
                              const draft = orderDrafts[order.id] ?? {
                                status: order.status,
                                paymentStatus: order.paymentStatus,
                              };
                              const isDirty =
                                draft.status !== order.status ||
                                draft.paymentStatus !== order.paymentStatus;
                              const isSaving = savingOrderId === order.id;

                              return (
                                <tr
                                  key={order.id}
                                  className="hover:bg-[#F4F2EC]/50"
                                >
                                  <td className="px-4 py-3 align-top">
                                    <div className="font-mono font-bold text-[#0E1113]">
                                      {order.id}
                                    </div>
                                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[#0E1113]/55">
                                      {formatTimestamp(order.createdAt)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <div className="font-medium text-[#0E1113]">
                                      {order.customer.fullName}
                                    </div>
                                    <div className="text-[11px] text-[#0E1113]/55">
                                      {order.customerEmail} ·{' '}
                                      {order.customer.phone}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top tabular-nums text-[#0E1113]/80">
                                    {order.items.reduce(
                                      (sum, item) => sum + item.quantity,
                                      0,
                                    )}{' '}
                                    units
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <select
                                      aria-label={`Fulfillment status for ${order.id}`}
                                      value={draft.status}
                                      onChange={(e) =>
                                        setOrderDrafts((prev) => ({
                                          ...prev,
                                          [order.id]: {
                                            ...draft,
                                            status: e.target
                                              .value as Order['status'],
                                          },
                                        }))
                                      }
                                      className="border border-[#0E1113]/20 bg-[#F4F2EC] px-2.5 py-1.5 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                                    >
                                      {ORDER_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <select
                                      aria-label={`Payment status for ${order.id}`}
                                      value={draft.paymentStatus}
                                      onChange={(e) =>
                                        setOrderDrafts((prev) => ({
                                          ...prev,
                                          [order.id]: {
                                            ...draft,
                                            paymentStatus: e.target
                                              .value as OrderPaymentStatus,
                                          },
                                        }))
                                      }
                                      className="border border-[#0E1113]/20 bg-[#F4F2EC] px-2.5 py-1.5 font-mono text-xs uppercase text-[#0E1113] outline-none focus:border-[#0E1113]"
                                    >
                                      {PAYMENT_STATUSES.map((p) => (
                                        <option key={p} value={p}>
                                          {p}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 align-top text-right font-mono font-semibold tabular-nums text-[#0E1113]">
                                    {formatUsdAmount(order.totalUsd)}
                                  </td>
                                  <td className="px-4 py-3 align-top text-right">
                                    <button
                                      type="button"
                                      disabled={!isDirty || isSaving}
                                      onClick={() => void handleSaveOrder(order)}
                                      className="inline-flex items-center gap-1.5 bg-[#0E1113] px-3 py-1.5 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] disabled:opacity-35 cursor-pointer whitespace-nowrap"
                                    >
                                      <Save className="h-3 w-3" />
                                      {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INVENTORY & PRICING */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Inventory &amp; Pricing Overrides
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Adjust product prices, branch availability across
                      Sonthormuk, Sen Sok, and Chomkadong, or archive items.
                      Changes persist to Cloud SQL and sync immediately to the
                      live storefront catalog.
                    </p>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center gap-3 border border-[#0E1113]/15 bg-[#FDFCF9] p-4">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#0E1113]/45" />
                      <input
                        type="search"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Search 80 SKUs by name, brand, or product ID..."
                        className="w-full border border-[#0E1113]/15 bg-[#F4F2EC] py-2 pr-3 pl-9 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                      />
                    </div>
                    <select
                      aria-label="Filter catalog category"
                      value={inventoryCategory}
                      onChange={(e) => setInventoryCategory(e.target.value)}
                      className="border border-[#0E1113]/15 bg-[#F4F2EC] px-3 py-2 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                    >
                      <option value="all">All Categories</option>
                      <option value="boots">Football Boots</option>
                      <option value="jerseys">Jerseys &amp; Kits</option>
                      <option value="f1">F1 Motorsport</option>
                      <option value="balls">Match Balls</option>
                      <option value="essentials">Essentials</option>
                    </select>
                    <span className="font-mono text-xs tabular-nums text-[#0E1113]/60">
                      {filteredInventory.length} items
                    </span>
                  </div>

                  {/* Inventory Grid Table */}
                  <div className="border border-[#0E1113]/15 bg-[#FDFCF9]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#0E1113]/15 text-[#0E1113]/60">
                          <tr>
                            <th className="px-4 py-3 font-medium">Product</th>
                            <th className="px-4 py-3 text-right font-medium">
                              Price (USD)
                            </th>
                            <th className="px-4 py-3 font-medium">Sonthormuk</th>
                            <th className="px-4 py-3 font-medium">Sen Sok</th>
                            <th className="px-4 py-3 font-medium">Chomkadong</th>
                            <th className="px-4 py-3 font-medium">State</th>
                            <th className="px-4 py-3 text-right font-medium">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0E1113]/10">
                          {filteredInventory.map((item) => {
                            const isEditing =
                              editingProductId === item.product.id &&
                              inventoryDraft !== null;
                            const isSaving =
                              savingProductId === item.product.id;

                            return (
                              <React.Fragment key={item.product.id}>
                                <tr className="hover:bg-[#F4F2EC]/50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-[#0E1113]">
                                      {item.product.name}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-[#0E1113]/55">
                                      {item.product.brand} ·{' '}
                                      {item.product.category}
                                      {item.override ? ' · Overridden' : ''}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#0E1113]">
                                    {formatUsdAmount(item.product.price)}
                                  </td>
                                  <td className="px-4 py-3 text-[#0E1113]/80">
                                    {item.product.branchStock.sonthormuk}
                                  </td>
                                  <td className="px-4 py-3 text-[#0E1113]/80">
                                    {item.product.branchStock.sensok}
                                  </td>
                                  <td className="px-4 py-3 text-[#0E1113]/80">
                                    {item.product.branchStock.chomkadong}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[11px]">
                                    {item.isArchived ? (
                                      <span className="font-semibold text-[#C8232C]">
                                        Archived
                                      </span>
                                    ) : (
                                      <span className="text-emerald-700">
                                        Live
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        isEditing
                                          ? (setEditingProductId(null),
                                            setInventoryDraft(null))
                                          : openInventoryEditor(item)
                                      }
                                      className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-1.5 text-xs font-medium text-[#0E1113] transition hover:border-[#0E1113] cursor-pointer whitespace-nowrap"
                                    >
                                      {isEditing ? 'Close' : 'Edit'}
                                    </button>
                                  </td>
                                </tr>

                                {isEditing && inventoryDraft && (
                                  <tr className="bg-[#F4F2EC]/80">
                                    <td colSpan={7} className="p-5">
                                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Live Price (USD)
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={inventoryDraft.priceUsd}
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                priceUsd: e.target.value,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-3 py-2 font-mono text-xs tabular-nums text-[#0E1113]"
                                          />
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Compare-At Price
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            placeholder="Optional"
                                            value={
                                              inventoryDraft.originalPriceUsd
                                            }
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                originalPriceUsd:
                                                  e.target.value,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-3 py-2 font-mono text-xs tabular-nums text-[#0E1113]"
                                          />
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Sonthormuk Stock
                                          </label>
                                          <select
                                            value={
                                              inventoryDraft.sonthormukStock
                                            }
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                sonthormukStock: e.target
                                                  .value as StockLevel,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-2.5 py-2 text-xs text-[#0E1113]"
                                          >
                                            {STOCK_LEVELS.map((lvl) => (
                                              <option key={lvl} value={lvl}>
                                                {lvl}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Sen Sok Stock
                                          </label>
                                          <select
                                            value={inventoryDraft.sensokStock}
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                sensokStock: e.target
                                                  .value as StockLevel,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-2.5 py-2 text-xs text-[#0E1113]"
                                          >
                                            {STOCK_LEVELS.map((lvl) => (
                                              <option key={lvl} value={lvl}>
                                                {lvl}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Chomkadong Stock
                                          </label>
                                          <select
                                            value={
                                              inventoryDraft.chomkadongStock
                                            }
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                chomkadongStock: e.target
                                                  .value as StockLevel,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-2.5 py-2 text-xs text-[#0E1113]"
                                          >
                                            {STOCK_LEVELS.map((lvl) => (
                                              <option key={lvl} value={lvl}>
                                                {lvl}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div>
                                          <label className="mb-1 block text-[11px] font-medium text-[#0E1113]/70">
                                            Units Available
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="Optional"
                                            value={
                                              inventoryDraft.unitsAvailable
                                            }
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                unitsAvailable: e.target.value,
                                              })
                                            }
                                            className="w-full border border-[#0E1113]/20 bg-[#FDFCF9] px-3 py-2 font-mono text-xs tabular-nums text-[#0E1113]"
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0E1113]/10 pt-4">
                                        <label className="inline-flex items-center gap-2 text-xs text-[#0E1113] cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={inventoryDraft.isArchived}
                                            onChange={(e) =>
                                              setInventoryDraft({
                                                ...inventoryDraft,
                                                isArchived: e.target.checked,
                                              })
                                            }
                                            className="h-4 w-4 accent-[#C8232C]"
                                          />
                                          Archive product (hide from public
                                          storefront)
                                        </label>

                                        <div className="flex flex-wrap items-center gap-2">
                                          {item.override && (
                                            <button
                                              type="button"
                                              disabled={isSaving}
                                              onClick={() =>
                                                void handleResetInventoryOverride(
                                                  item.product.id,
                                                )
                                              }
                                              className="inline-flex items-center gap-1.5 border border-[#0E1113]/20 bg-[#FDFCF9] px-3.5 py-2 text-xs font-medium text-[#0E1113] hover:border-[#0E1113] disabled:opacity-50 cursor-pointer"
                                            >
                                              <RotateCcw className="h-3.5 w-3.5" />
                                              Reset to Default
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() =>
                                              void handleSaveInventory(
                                                item.product.id,
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] disabled:opacity-50 cursor-pointer"
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                            {isSaving
                                              ? 'Saving...'
                                              : 'Save to Live Catalog'}
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REAL-TIME DATABASE LATENCY TRENDS */}
              {activeTab === 'latency' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Database Latency Monitor
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Real-time Cloud SQL PostgreSQL response trends, P95
                      tracking, and alert threshold monitoring powered by{' '}
                      <code className="font-mono text-xs text-[#0E1113]">
                        /api/system-health/metrics
                      </code>
                      .
                    </p>
                  </div>

                  <DatabaseLatencyChart
                    limit={60}
                    defaultPollSeconds={5}
                    showRecentTable
                  />
                </div>
              )}

              {/* TAB 5: PAYMENT WEBHOOKS AUDIT */}
              {activeTab === 'webhooks' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Payment Gateway Webhooks
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Signed ABA KHQR and Stripe webhook events processed with
                      HMAC verification and idempotency protection.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border border-[#0E1113]/15 bg-[#FDFCF9] p-5 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-[#0E1113]">
                        ABA KHQR Endpoint
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#0E1113]/75">
                        POST /api/webhooks/payments/aba-khqr
                      </p>
                      <p className="mt-1 text-[11px] text-[#0E1113]/55">
                        Requires ABA_WEBHOOK_SECRET in Settings → Secrets
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0E1113]">
                        Stripe Endpoint
                      </p>
                      <p className="mt-1 font-mono text-xs text-[#0E1113]/75">
                        POST /api/webhooks/payments/stripe
                      </p>
                      <p className="mt-1 text-[11px] text-[#0E1113]/55">
                        Requires STRIPE_WEBHOOK_SECRET in Settings → Secrets
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#0E1113]/15 bg-[#FDFCF9]">
                    {webhooks.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-sm font-medium text-[#0E1113]">
                          No payment webhook events received yet
                        </p>
                        <p className="mt-1 text-xs text-[#0E1113]/60">
                          Once ABA KHQR or Stripe secrets from GO_LIVE_NOTES.md
                          are configured, verified settlement callbacks will be
                          logged here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#0E1113]/15 text-[#0E1113]/60">
                            <tr>
                              <th className="px-4 py-3 font-medium">Received</th>
                              <th className="px-4 py-3 font-medium">Provider</th>
                              <th className="px-4 py-3 font-medium">Event</th>
                              <th className="px-4 py-3 font-medium">Order</th>
                              <th className="px-4 py-3 text-right font-medium">
                                Amount
                              </th>
                              <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0E1113]/10">
                            {webhooks.map((evt) => (
                              <tr key={evt.id} className="hover:bg-[#F4F2EC]/50">
                                <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-[#0E1113]/65">
                                  {formatTimestamp(evt.receivedAt)}
                                </td>
                                <td className="px-4 py-3 font-mono uppercase text-[#0E1113]">
                                  {evt.provider}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-[#0E1113]/80">
                                  {evt.eventType}
                                </td>
                                <td className="px-4 py-3 font-mono font-semibold text-[#0E1113]">
                                  {evt.orderId ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0E1113]">
                                  {evt.amountUsd !== null
                                    ? formatUsdAmount(evt.amountUsd)
                                    : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono uppercase text-[#0E1113]/80">
                                  {evt.processingStatus}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: NOTIFICATIONS & TEST DISPATCH */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0E1113]">
                      Automated Notifications
                    </h1>
                    <p className="mt-1 text-sm text-[#0E1113]/65">
                      Review Telegram and Resend email delivery logs and send a
                      live verification alert across configured channels.
                    </p>
                  </div>

                  {/* Send Test Notification Form */}
                  <form
                    onSubmit={handleSendTestNotification}
                    className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5"
                  >
                    <h2 className="text-sm font-semibold text-[#0E1113]">
                      Send Test Notification
                    </h2>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label
                          htmlFor="test-notif-email"
                          className="mb-1 block text-xs font-medium text-[#0E1113]/70"
                        >
                          Recipient Email (Optional)
                        </label>
                        <input
                          id="test-notif-email"
                          type="email"
                          value={testRecipientEmail}
                          onChange={(e) =>
                            setTestRecipientEmail(e.target.value)
                          }
                          placeholder="owner@sportcastle.kh"
                          className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          htmlFor="test-notif-msg"
                          className="mb-1 block text-xs font-medium text-[#0E1113]/70"
                        >
                          Verification Message
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            id="test-notif-msg"
                            type="text"
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            className="flex-1 border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-xs text-[#0E1113] outline-none focus:border-[#0E1113]"
                            required
                          />
                          <button
                            type="submit"
                            disabled={isSendingTest}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#0E1113] px-4 py-2 text-xs font-semibold text-[#FDFCF9] transition hover:bg-[#C8232C] disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {isSendingTest ? 'Sending...' : 'Send Test'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Delivery Log Table */}
                  <div className="border border-[#0E1113]/15 bg-[#FDFCF9]">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-sm font-medium text-[#0E1113]">
                          No notifications logged yet
                        </p>
                        <p className="mt-1 text-xs text-[#0E1113]/60">
                          Click &ldquo;Send Test&rdquo; above or place an order
                          to record Telegram and Email delivery audits.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[#0E1113]/15 text-[#0E1113]/60">
                            <tr>
                              <th className="px-4 py-3 font-medium">Time</th>
                              <th className="px-4 py-3 font-medium">Channel</th>
                              <th className="px-4 py-3 font-medium">Event</th>
                              <th className="px-4 py-3 font-medium">
                                Recipient
                              </th>
                              <th className="px-4 py-3 font-medium">Status</th>
                              <th className="px-4 py-3 font-medium">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0E1113]/10">
                            {notifications.map((row) => (
                              <tr key={row.id} className="hover:bg-[#F4F2EC]/50">
                                <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-[#0E1113]/65">
                                  {formatTimestamp(row.createdAt)}
                                </td>
                                <td className="px-4 py-3 font-mono uppercase text-[#0E1113]">
                                  {row.channel}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-[#0E1113]/80">
                                  {row.eventType}
                                </td>
                                <td className="px-4 py-3 text-[#0E1113]/85">
                                  {row.recipient}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] font-semibold uppercase">
                                  <span
                                    className={
                                      row.status === 'sent'
                                        ? 'text-emerald-700'
                                        : row.status === 'failed'
                                          ? 'text-[#C8232C]'
                                          : 'text-amber-700'
                                    }
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[11px] text-[#0E1113]/60">
                                  {row.providerMessageId
                                    ? `ID: ${row.providerMessageId}`
                                    : (row.errorMessage ?? '—')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

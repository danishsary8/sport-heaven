import { SEEDED_SAMPLE_ORDER } from '../data/catalog.ts';
import { MOCK_STORE_CATALOG } from '../lib/mock-store/catalog.ts';
import type { Order } from '../types/store';

export type OrderStatus = Order['status'];

export type OrderStatusFilter = 'all' | 'active' | OrderStatus;

export interface OrderStatusMeta {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  stageStep: number;
  totalSteps: number;
  progressPercent: number;
  isActive: boolean;
  summaryNote: string;
  badgeClass: string;
  barClass: string;
  dotClass: string;
}

export interface OrderHistorySummary {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalSpentUsd: number;
  totalItems: number;
}

export const ORDER_STATUS_FILTERS: ReadonlyArray<{
  value: OrderStatusFilter;
  label: string;
}> = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'In Progress' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Heat-Press Printing', label: 'Heat-Press Printing' },
  { value: 'Rider Dispatched', label: 'Rider Dispatched' },
  { value: 'Delivered', label: 'Delivered' },
];

const STATUS_META_MAP: Record<OrderStatus, OrderStatusMeta> = {
  Confirmed: {
    status: 'Confirmed',
    label: 'Confirmed',
    shortLabel: 'Confirmed',
    stageStep: 1,
    totalSteps: 4,
    progressPercent: 25,
    isActive: true,
    summaryNote: 'Payment verified & stock reserved at Phnom Penh atelier.',
    badgeClass: 'border border-[#0E1113]/25 bg-[#EAE7DF] text-[#0E1113]',
    barClass: 'bg-[#0E1113]',
    dotClass: 'bg-[#0E1113]',
  },
  'Heat-Press Printing': {
    status: 'Heat-Press Printing',
    label: 'Heat-Press Printing',
    shortLabel: 'Heat-Press',
    stageStep: 2,
    totalSteps: 4,
    progressPercent: 50,
    isActive: true,
    summaryNote: 'Custom TPU vinyl name, number & sleeve patch in calibration press.',
    badgeClass: 'border border-[#B8933B]/45 bg-[#B8933B]/15 text-[#7A5B14]',
    barClass: 'bg-[#B8933B]',
    dotClass: 'bg-[#B8933B]',
  },
  'Rider Dispatched': {
    status: 'Rider Dispatched',
    label: 'Rider Dispatched',
    shortLabel: 'Dispatched',
    stageStep: 3,
    totalSteps: 4,
    progressPercent: 75,
    isActive: true,
    summaryNote: 'Express courier en route across Phnom Penh with live handoff.',
    badgeClass: 'border border-[#032EA1]/35 bg-[#032EA1]/10 text-[#032EA1]',
    barClass: 'bg-[#032EA1]',
    dotClass: 'bg-[#032EA1]',
  },
  Delivered: {
    status: 'Delivered',
    label: 'Delivered',
    shortLabel: 'Delivered',
    stageStep: 4,
    totalSteps: 4,
    progressPercent: 100,
    isActive: false,
    summaryNote: 'Handed over & signed with 30-day Phnom Penh size exchange cover.',
    badgeClass: 'border border-emerald-800/30 bg-emerald-900/10 text-emerald-900',
    barClass: 'bg-emerald-800',
    dotClass: 'bg-emerald-800',
  },
};

export function getOrderStatusMeta(status: OrderStatus): OrderStatusMeta {
  return STATUS_META_MAP[status] ?? STATUS_META_MAP.Confirmed;
}

export function sortOrdersByNewest(orders: readonly Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const timeA = Date.parse(a.createdAt);
    const timeB = Date.parse(b.createdAt);
    const safeA = Number.isNaN(timeA) ? 0 : timeA;
    const safeB = Number.isNaN(timeB) ? 0 : timeB;
    return safeB - safeA;
  });
}

export function filterOrdersByStatus(
  orders: readonly Order[],
  filter: OrderStatusFilter,
): Order[] {
  const sorted = sortOrdersByNewest(orders);
  if (filter === 'all') return sorted;
  if (filter === 'active') {
    return sorted.filter((order) => order.status !== 'Delivered');
  }
  return sorted.filter((order) => order.status === filter);
}

export function getOrderStatusCounts(
  orders: readonly Order[],
): Record<OrderStatusFilter, number> {
  const counts: Record<OrderStatusFilter, number> = {
    all: orders.length,
    active: 0,
    Confirmed: 0,
    'Heat-Press Printing': 0,
    'Rider Dispatched': 0,
    Delivered: 0,
  };

  for (const order of orders) {
    if (order.status !== 'Delivered') {
      counts.active += 1;
    }
    if (order.status in counts) {
      counts[order.status] += 1;
    }
  }

  return counts;
}

export function getOrderHistorySummary(
  orders: readonly Order[],
): OrderHistorySummary {
  let activeOrders = 0;
  let deliveredOrders = 0;
  let totalSpentUsd = 0;
  let totalItems = 0;

  for (const order of orders) {
    if (order.status === 'Delivered') {
      deliveredOrders += 1;
    } else {
      activeOrders += 1;
    }
    totalSpentUsd += order.totalUsd;
    for (const item of order.items) {
      totalItems += item.quantity;
    }
  }

  return {
    totalOrders: orders.length,
    activeOrders,
    deliveredOrders,
    totalSpentUsd: Number(totalSpentUsd.toFixed(2)),
    totalItems,
  };
}

export function getRecentOrders(orders: readonly Order[], limit = 3): Order[] {
  if (limit <= 0) return [];
  return sortOrdersByNewest(orders).slice(0, limit);
}

export function formatOrderDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type OrderTransitStepState = 'completed' | 'current' | 'upcoming';

export type OrderTransitStepKey = 'confirmed' | 'prep' | 'transit' | 'delivered';

export interface OrderTransitStep {
  key: OrderTransitStepKey;
  stepNumber: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  detail: string;
  location: string;
  timestampLabel: string;
  state: OrderTransitStepState;
  connectorAfterFilled: boolean;
}

export interface OrderTransitTimelineData {
  orderId: string;
  status: OrderStatus;
  stageStep: number;
  totalSteps: 4;
  progressPercent: number;
  activeStepIndex: number;
  completedCount: number;
  isDelivered: boolean;
  hasCustomPrint: boolean;
  fulfillmentType: 'delivery' | 'pickup';
  headline: string;
  etaLabel: string;
  steps: readonly OrderTransitStep[];
}

export function getBranchDisplayName(
  pickupBranch?: Order['pickupBranch'],
): string {
  if (pickupBranch === 'sensok') return 'Sen Sok Pitch Hub';
  if (pickupBranch === 'chomkadong') return 'Chomkadong South';
  return 'Sonthormuk Flagship';
}

export function formatOrderFulfillmentLabel(order: Order): string {
  if (order.fulfillmentMethod === 'pickup') {
    return `Branch Pickup · ${getBranchDisplayName(order.pickupBranch)}`;
  }
  const district = order.customer.khan || 'Phnom Penh';
  return `Express Delivery · ${district}`;
}

function formatTransitTimestamp(
  baseMs: number,
  offsetMinutes: number,
  state: OrderTransitStepState,
): string {
  if (Number.isNaN(baseMs)) {
    if (state === 'completed') return 'Recorded';
    if (state === 'current') return 'In Progress';
    return 'Scheduled';
  }
  const target = new Date(baseMs + offsetMinutes * 60_000);
  const formatted = target.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Phnom_Penh',
  });
  return state === 'upcoming' ? `Est. ${formatted} ICT` : `${formatted} ICT`;
}

/**
 * Pure builder that derives the 4-stage visual transit timeline for an order
 * shown in AccountPage's 'My Orders' section and individual order view.
 */
export function buildOrderTransitTimeline(
  order: Order,
): OrderTransitTimelineData {
  const meta = getOrderStatusMeta(order.status);
  const isDelivered = order.status === 'Delivered';
  const activeStepIndex = Math.max(0, Math.min(3, meta.stageStep - 1));
  const fulfillmentType = order.fulfillmentMethod;
  const branchName = getBranchDisplayName(order.pickupBranch);
  const district = order.customer.khan || 'Phnom Penh';
  const printedItem = order.items.find((item) => item.customPrint?.enabled);
  const hasCustomPrint = Boolean(printedItem);
  const printSummary = printedItem?.customPrint
    ? `${printedItem.customPrint.playerName || 'CUSTOM'} #${printedItem.customPrint.squadNumber || '--'}`
    : null;
  const baseMs = Date.parse(order.createdAt);

  const resolveState = (index: number): OrderTransitStepState => {
    if (isDelivered) return 'completed';
    if (index < activeStepIndex) return 'completed';
    if (index === activeStepIndex) return 'current';
    return 'upcoming';
  };

  const stepOffsets = hasCustomPrint ? [0, 35, 95, 165] : [0, 25, 65, 145];

  const paymentDisplay =
    order.paymentMethod === 'aba-khqr'
      ? 'ABA KHQR'
      : order.paymentMethod === 'wing-acleda'
        ? 'Wing / ACLEDA'
        : order.paymentMethod === 'apple-pay'
          ? 'Apple Pay'
          : order.paymentMethod === 'google-pay'
            ? 'Google Pay'
            : order.paymentMethod === 'paypal'
              ? 'PayPal'
              : order.paymentMethod === 'cod'
                ? 'Cash on Delivery'
                : 'Card Payment';

  const rawSteps: Array<{
    key: OrderTransitStepKey;
    stepNumber: 1 | 2 | 3 | 4;
    label: string;
    shortLabel: string;
    detail: string;
    location: string;
  }> = [
    {
      key: 'confirmed',
      stepNumber: 1,
      label: 'Order Confirmed',
      shortLabel: 'Confirmed',
      detail: `${paymentDisplay} verified and stock allocated from Phnom Penh inventory.`,
      location: 'Sonthormuk Flagship HQ',
    },
    {
      key: 'prep',
      stepNumber: 2,
      label: hasCustomPrint ? 'Heat-Press Lab' : 'Studio QC & Pack',
      shortLabel: hasCustomPrint ? 'Heat-Press' : 'Studio QC',
      detail: hasCustomPrint
        ? `Pressing ${printSummary} official TPU vinyl & sleeve patch at 150°C.`
        : 'Authenticity tags, sizing, and matchday packaging inspected.',
      location: hasCustomPrint
        ? 'Sonthormuk Heat-Press Lab'
        : `${branchName} Fulfillment`,
    },
    {
      key: 'transit',
      stepNumber: 3,
      label:
        fulfillmentType === 'pickup' ? 'Ready for Pickup' : 'Rider Dispatched',
      shortLabel: fulfillmentType === 'pickup' ? 'Ready' : 'Dispatched',
      detail:
        fulfillmentType === 'pickup'
          ? `Packed and awaiting collection at ${branchName} pickup counter.`
          : `Express Sport Castle courier en route toward ${district}.`,
      location: fulfillmentType === 'pickup' ? branchName : `En route · ${district}`,
    },
    {
      key: 'delivered',
      stepNumber: 4,
      label: fulfillmentType === 'pickup' ? 'Collected' : 'Delivered',
      shortLabel: fulfillmentType === 'pickup' ? 'Collected' : 'Delivered',
      detail:
        fulfillmentType === 'pickup'
          ? `Collected in-store at ${branchName} with 30-day size exchange cover.`
          : `Handed over & signed in ${district} with 30-day size exchange cover.`,
      location: fulfillmentType === 'pickup' ? branchName : district,
    },
  ];

  const steps: OrderTransitStep[] = rawSteps.map((raw, index) => {
    const state = resolveState(index);
    const connectorAfterFilled =
      index < 3 && (isDelivered || index < activeStepIndex);
    return {
      ...raw,
      state,
      timestampLabel: formatTransitTimestamp(baseMs, stepOffsets[index], state),
      connectorAfterFilled,
    };
  });

  const completedCount = steps.filter((s) => s.state === 'completed').length;

  let headline: string;
  if (isDelivered) {
    headline =
      fulfillmentType === 'pickup'
        ? `Collected at ${branchName}`
        : `Delivered & signed in ${district}`;
  } else if (order.status === 'Rider Dispatched') {
    headline =
      fulfillmentType === 'pickup'
        ? `Ready for pickup at ${branchName}`
        : `Express rider en route to ${district}`;
  } else if (order.status === 'Heat-Press Printing') {
    headline = hasCustomPrint && printSummary
      ? `Pressing ${printSummary} at Sonthormuk Heat-Press Lab`
      : `Quality verification & packing at ${branchName}`;
  } else {
    headline = `Order confirmed · queued for ${hasCustomPrint ? 'Heat-Press Lab' : 'Studio QC'}`;
  }

  const finalTimestamp = steps[3].timestampLabel.replace(/^Est\.\s*/, '');
  const etaLabel = isDelivered
    ? `Completed · ${finalTimestamp}`
    : fulfillmentType === 'pickup'
      ? `Est. Ready · ${steps[2].timestampLabel.replace(/^Est\.\s*/, '')}`
      : `Est. Arrival · ${finalTimestamp}`;

  return {
    orderId: order.id,
    status: order.status,
    stageStep: meta.stageStep,
    totalSteps: 4,
    progressPercent: meta.progressPercent,
    activeStepIndex,
    completedCount,
    isDelivered,
    hasCustomPrint,
    fulfillmentType,
    headline,
    etaLabel,
    steps,
  };
}

/**
 * Deterministic initial recent orders for the signed-in Phnom Penh member profile
 * (`Sokha Chan`), spanning active heat-press printing, live rider dispatch, and
 * delivered history so the AccountPage 'My Orders' section demonstrates real statuses
 * while seamlessly syncing with checkout and `/pages/track-order`.
 */
export function getInitialMemberOrders(): Order[] {
  const barcaHome =
    MOCK_STORE_CATALOG.find((p) => p.id === 'jersey-barca-2627-home') ??
    MOCK_STORE_CATALOG[0];
  const predatorBoot =
    MOCK_STORE_CATALOG.find((p) => p.id === 'boot-predator-25-elite-ft') ??
    MOCK_STORE_CATALOG[1];

  const heatPressOrder: Order = {
    id: 'SC-8942',
    createdAt: '2026-11-19T10:35:00.000Z',
    status: 'Heat-Press Printing',
    fulfillmentMethod: 'pickup',
    pickupBranch: 'sonthormuk',
    customer: {
      fullName: 'Sokha Chan',
      email: 'sokha.chan@phnompenhfc.kh',
      phone: '+855 12 456 789',
      telegram: '@SokhaStriker',
      khan: 'Khan Toul Kork',
      sangkat: 'Sangkat Boeung Kak 1',
      streetAddress: 'Sonthormuk Flagship Pickup Counter',
      coordinates: { lat: 11.5688, lng: 104.8994 },
      notes: 'Collect before 7:30 PM matchday session',
    },
    paymentMethod: 'aba-khqr',
    items: [
      {
        lineId: `${barcaHome.id}::M::print::YAMAL::10::ucl::pro-condensed`,
        productId: barcaHome.id,
        slug: barcaHome.slug,
        name: barcaHome.name,
        brand: barcaHome.brand,
        category: barcaHome.category,
        colorway: barcaHome.colorway,
        image: barcaHome.image,
        size: 'M',
        basePrice: barcaHome.price,
        unitPrice: barcaHome.price + 13,
        quantity: 1,
        customPrint: {
          enabled: true,
          playerName: 'YAMAL',
          squadNumber: '10',
          patch: 'ucl',
          fontStyle: 'pro-condensed',
        },
      },
    ],
    subtotal: barcaHome.price + 13,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: barcaHome.price + 13,
    totalKhr: Math.round((barcaHome.price + 13) * 4100),
  };

  const dispatchedOrder: Order = {
    ...SEEDED_SAMPLE_ORDER,
    customer: {
      ...SEEDED_SAMPLE_ORDER.customer,
      fullName: 'Sokha Chan',
      email: 'sokha.chan@phnompenhfc.kh',
      phone: '+855 12 456 789',
      telegram: '@SokhaStriker',
      coordinates: { lat: 11.5761, lng: 104.8989 },
    },
  };

  const deliveredOrder: Order = {
    id: 'SC-8615',
    createdAt: '2026-11-09T09:10:00.000Z',
    status: 'Delivered',
    fulfillmentMethod: 'delivery',
    customer: {
      fullName: 'Sokha Chan',
      email: 'sokha.chan@phnompenhfc.kh',
      phone: '+855 12 456 789',
      telegram: '@SokhaStriker',
      khan: 'Khan Boeung Keng Kang (BKK)',
      sangkat: 'Sangkat BKK1',
      streetAddress: 'Floor 4, Street 51, Corner Street 306',
      coordinates: { lat: 11.5517, lng: 104.9255 },
      notes: 'Left at office reception desk',
    },
    paymentMethod: 'card',
    items: [
      {
        lineId: `${predatorBoot.id}::EU 42::plain`,
        productId: predatorBoot.id,
        slug: predatorBoot.slug,
        name: predatorBoot.name,
        brand: predatorBoot.brand,
        category: predatorBoot.category,
        colorway: predatorBoot.colorway,
        image: predatorBoot.image,
        size: 'EU 42',
        basePrice: predatorBoot.price,
        unitPrice: predatorBoot.price,
        quantity: 1,
      },
    ],
    subtotal: predatorBoot.price,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: predatorBoot.price,
    totalKhr: Math.round(predatorBoot.price * 4100),
  };

  return sortOrdersByNewest([heatPressOrder, dispatchedOrder, deliveredOrder]);
}

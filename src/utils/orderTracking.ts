import { BRANCHES, SEEDED_SAMPLE_ORDER } from '../data/catalog';
import { MOCK_STORE_CATALOG } from '../lib/mock-store/catalog';
import type { BranchId, Order } from '../types/store';

export interface TrackingMilestone {
  id: string;
  stage: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  state: 'completed' | 'current' | 'upcoming';
}

export interface TrackingLookupValidation {
  orderId?: string;
  email?: string;
}

export interface TrackedOrderResult {
  order: Order;
  carrier: string;
  trackingNumber: string;
  estimatedWindow: string;
  riderName: string;
  riderPhone: string;
  currentHub: string;
  progressPercent: number;
  milestones: TrackingMilestone[];
  destinationCoords: { lat: number; lng: number };
}

export interface OrderBriefSummary {
  orderId: string;
  orderDateLabel: string;
  orderTimeLabel: string;
  totalUsd: number;
  totalKhr: number;
  itemCount: number;
  paymentLabel: string;
  addressHeading: string;
  recipientName: string;
  addressPrimary: string;
  addressSecondary: string;
  reassuranceNote: string;
}

export interface PhnomPenhCoordinateMatch {
  khan: string;
  sangkat: string;
  landmarkHint: string;
  nearestBranchId: BranchId;
  nearestBranchName: string;
  distanceKm: number;
  withinPhnomPenh: boolean;
}

export const BRANCH_COORDINATES: Record<BranchId, { lat: number; lng: number }> = {
  sonthormuk: { lat: 11.5688, lng: 104.8994 },
  sensok: { lat: 11.5974, lng: 104.8781 },
  chomkadong: { lat: 11.5032, lng: 104.8797 },
};

const KHAN_CENTROIDS: Array<{
  khan: string;
  sangkat: string;
  landmarkHint: string;
  lat: number;
  lng: number;
}> = [
  {
    khan: 'Khan Toul Kork',
    sangkat: 'Sangkat Boeung Kak 1',
    landmarkHint: 'Near TK Avenue / Street 315',
    lat: 11.5761,
    lng: 104.8989,
  },
  {
    khan: 'Khan Sen Sok',
    sangkat: 'Sangkat Phnom Penh Thmey',
    landmarkHint: 'Near AEON Mall Sen Sok / Street 1986',
    lat: 11.5974,
    lng: 104.8781,
  },
  {
    khan: 'Khan Boeung Keng Kang (BKK)',
    sangkat: 'Sangkat BKK1',
    landmarkHint: 'Near Street 51 / Pasteur',
    lat: 11.5517,
    lng: 104.9255,
  },
  {
    khan: 'Khan Daun Penh',
    sangkat: 'Sangkat Chaktomuk',
    landmarkHint: 'Near Riverside / Wat Phnom',
    lat: 11.5696,
    lng: 104.9251,
  },
  {
    khan: 'Khan Chamkar Mon',
    sangkat: 'Sangkat Tonle Bassac',
    landmarkHint: 'Near AEON Mall 1 / Koh Pich',
    lat: 11.5471,
    lng: 104.9334,
  },
  {
    khan: 'Khan Prampir Makara',
    sangkat: 'Sangkat Veal Vong',
    landmarkHint: 'Near Olympic National Stadium',
    lat: 11.5586,
    lng: 104.9119,
  },
  {
    khan: 'Khan Mean Chey',
    sangkat: 'Sangkat Boeung Tumpun',
    landmarkHint: 'Near Street 271 / Russian Market South',
    lat: 11.5292,
    lng: 104.9126,
  },
  {
    khan: 'Khan Dangkao',
    sangkat: 'Sangkat Prey Sa',
    landmarkHint: 'Near Chomkadong Street 217',
    lat: 11.5032,
    lng: 104.8797,
  },
  {
    khan: 'Khan Chroy Changvar',
    sangkat: 'Sangkat Chroy Changvar',
    landmarkHint: 'Across Japanese Friendship Bridge',
    lat: 11.5887,
    lng: 104.9344,
  },
  {
    khan: 'Khan Russey Keo',
    sangkat: 'Sangkat Tuol Sangke',
    landmarkHint: 'Near National Road 5 / Kilometre 6',
    lat: 11.6108,
    lng: 104.9095,
  },
  {
    khan: 'Khan Chbar Ampov',
    sangkat: 'Sangkat Niroth',
    landmarkHint: 'Near National Road 1 / Borey Peng Huoth',
    lat: 11.5318,
    lng: 104.9562,
  },
  {
    khan: 'Khan Por Senchey',
    sangkat: 'Sangkat Chaom Chau',
    landmarkHint: 'Near Phnom Penh International Airport',
    lat: 11.5466,
    lng: 104.8441,
  },
];

/**
 * Deterministic demo orders available on `/pages/track-order` in addition to
 * any orders placed in the current session.
 */
export function getBuiltInTrackableOrders(): Order[] {
  const madridHome =
    MOCK_STORE_CATALOG.find((p) => p.id === 'jersey-madrid-2627-home') ??
    MOCK_STORE_CATALOG[0];
  const tiempoTf =
    MOCK_STORE_CATALOG.find((p) => p.id === 'boot-tiempo-10-pro-tf') ??
    MOCK_STORE_CATALOG[1];
  const ferrariKit =
    MOCK_STORE_CATALOG.find((p) => p.id === 'f1-ferrari-2026-team-shirt') ??
    MOCK_STORE_CATALOG[2];

  const seededWithEmail: Order = {
    ...SEEDED_SAMPLE_ORDER,
    customer: {
      ...SEEDED_SAMPLE_ORDER.customer,
      email: SEEDED_SAMPLE_ORDER.customer.email || 'sokha.chan@phnompenhfc.kh',
      coordinates: { lat: 11.5761, lng: 104.8989 },
    },
  };

  const sampleDispatched: Order = {
    id: 'SC-9024',
    createdAt: '2026-05-19T08:40:00.000Z',
    status: 'Rider Dispatched',
    fulfillmentMethod: 'delivery',
    customer: {
      fullName: 'Vireak Chann',
      email: 'vireak.chann@bkkfc.kh',
      phone: '+855 17 512 904',
      telegram: '@VireakCaptain',
      khan: 'Khan Boeung Keng Kang (BKK)',
      sangkat: 'Sangkat BKK1',
      streetAddress: 'House 14, Street 306 (Near Pasteur)',
      notes: 'Call on arrival at BKK1 gate',
      coordinates: { lat: 11.5517, lng: 104.9255 },
    },
    paymentMethod: 'aba-khqr',
    items: [
      {
        lineId: `${madridHome.id}:L:BELLINGHAM:5:ucl`,
        productId: madridHome.id,
        slug: madridHome.slug,
        name: madridHome.name,
        brand: madridHome.brand,
        category: madridHome.category,
        colorway: madridHome.colorway,
        image: madridHome.image,
        size: 'L',
        basePrice: madridHome.price,
        unitPrice: madridHome.price + 11,
        quantity: 1,
        customPrint: {
          enabled: true,
          playerName: 'BELLINGHAM',
          squadNumber: '5',
          patch: 'ucl',
          fontStyle: 'pro-condensed',
        },
      },
      {
        lineId: `${tiempoTf.id}:EU 42:plain`,
        productId: tiempoTf.id,
        slug: tiempoTf.slug,
        name: tiempoTf.name,
        brand: tiempoTf.brand,
        category: tiempoTf.category,
        colorway: tiempoTf.colorway,
        image: tiempoTf.image,
        size: 'EU 42',
        basePrice: tiempoTf.price,
        unitPrice: tiempoTf.price,
        quantity: 1,
      },
    ],
    subtotal: madridHome.price + 11 + tiempoTf.price,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: madridHome.price + 11 + tiempoTf.price,
    totalKhr: Math.round((madridHome.price + 11 + tiempoTf.price) * 4100),
  };

  const sampleDelivered: Order = {
    id: 'SC-7742',
    createdAt: '2026-05-14T11:15:00.000Z',
    status: 'Delivered',
    fulfillmentMethod: 'pickup',
    pickupBranch: 'sensok',
    customer: {
      fullName: 'Dara Phan',
      email: 'dara.phan@paddock.kh',
      phone: '+855 96 441 208',
      telegram: '@DaraF1KH',
      khan: 'Khan Sen Sok',
      sangkat: 'Sangkat Phnom Penh Thmey',
      streetAddress: 'Sen Sok Pitch Hub Pickup',
      notes: 'Collected after evening 7v7 match',
      coordinates: { lat: 11.5974, lng: 104.8781 },
    },
    paymentMethod: 'wing-acleda',
    items: [
      {
        lineId: `${ferrariKit.id}:M:LECLERC:16:f1-paddock`,
        productId: ferrariKit.id,
        slug: ferrariKit.slug,
        name: ferrariKit.name,
        brand: ferrariKit.brand,
        category: ferrariKit.category,
        colorway: ferrariKit.colorway,
        image: ferrariKit.image,
        size: 'M',
        basePrice: ferrariKit.price,
        unitPrice: ferrariKit.price + 11,
        quantity: 1,
        customPrint: {
          enabled: true,
          playerName: 'LECLERC',
          squadNumber: '16',
          patch: 'f1-paddock',
          fontStyle: 'motorsport-aero',
        },
      },
    ],
    subtotal: ferrariKit.price + 11,
    teamDiscount: 0,
    promoDiscount: 0,
    shippingFee: 0,
    totalUsd: ferrariKit.price + 11,
    totalKhr: Math.round((ferrariKit.price + 11) * 4100),
  };

  return [seededWithEmail, sampleDispatched, sampleDelivered];
}

export function validateTrackingLookup(
  orderId: string,
  email: string,
): TrackingLookupValidation {
  const errors: TrackingLookupValidation = {};
  const cleanId = orderId.trim().replace(/^#/, '');
  const cleanEmail = email.trim();

  if (!cleanId) {
    errors.orderId = 'Please enter your Order ID (e.g. SC-8810 or SC-9024).';
  } else if (cleanId.length < 4) {
    errors.orderId = 'Order ID must be at least 4 characters (e.g. SC-8810).';
  }

  if (!cleanEmail) {
    errors.email = 'Please enter the email address used at checkout.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address (e.g. name@domain.kh).';
  }

  return errors;
}

export function buildShippingTimeline(order: Order): TrackingMilestone[] {
  const hasCustomPrint = order.items.some((item) => item.customPrint?.enabled);
  const isPickup = order.fulfillmentMethod === 'pickup';
  const branchName =
    BRANCHES.find((b) => b.id === (order.pickupBranch ?? 'sonthormuk'))?.name ??
    'Sonthormuk Flagship';

  const statusRank: Record<Order['status'], number> = {
    Confirmed: 1,
    'Heat-Press Printing': 2,
    'Rider Dispatched': 3,
    Delivered: 4,
  };
  const rank = statusRank[order.status] ?? 1;

  const baseDate = new Date(order.createdAt);
  const safeBase = Number.isNaN(baseDate.getTime()) ? new Date('2026-05-18T09:15:00.000Z') : baseDate;

  const formatOffset = (minutes: number) => {
    const d = new Date(safeBase.getTime() + minutes * 60_000);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const rawSteps: Array<{
    id: string;
    stage: string;
    title: string;
    description: string;
    location: string;
    offsetMinutes: number;
    stepRank: number;
  }> = [
    {
      id: 'confirmed',
      stage: '01 · Order Verified',
      title: 'Order Confirmed & Stock Reserved',
      description: `Payment (${order.paymentMethod.toUpperCase()}) verified and inventory locked at ${branchName}.`,
      location: `${branchName} · Phnom Penh`,
      offsetMinutes: 0,
      stepRank: 0,
    },
    {
      id: 'heat-press',
      stage: hasCustomPrint ? '02 · Pro Heat-Press Lab' : '02 · Quality Inspection',
      title: hasCustomPrint
        ? 'Custom Name, Number & Sleeve Patch Pressed'
        : 'Studio Sizing & Authenticity Check',
      description: hasCustomPrint
        ? 'Official TPU vinyl lettering aligned at 155°C and cooled on our calibration press.'
        : 'Soleplate, stitching, and official authenticity tags inspected prior to packing.',
      location: 'Sonthormuk Heat-Press Atelier · Khan Toul Kork',
      offsetMinutes: 25,
      stepRank: 1,
    },
    {
      id: 'packed',
      stage: '03 · Matchday Packaging',
      title: 'Sealed in Weatherproof Atelier Parcel',
      description: isPickup
        ? `Packed with receipt and staged at the ${branchName} express pickup counter.`
        : `Dispatched to Phnom Penh express rider queue for ${order.customer.khan}.`,
      location: `${branchName} Dispatch Desk`,
      offsetMinutes: 55,
      stepRank: 2,
    },
    {
      id: 'dispatched',
      stage: isPickup ? '04 · Ready for Collection' : '04 · Rider En Route',
      title: isPickup
        ? `Ready for In-Store Pickup (${branchName})`
        : `Express Courier En Route to ${order.customer.khan}`,
      description: isPickup
        ? 'Show your Order ID at the desk — boot try-on strip available during pickup.'
        : `Motorbike courier heading to ${order.customer.streetAddress || order.customer.khan} with live Telegram updates.`,
      location: isPickup
        ? branchName
        : `${order.customer.sangkat ? `${order.customer.sangkat}, ` : ''}${order.customer.khan}`,
      offsetMinutes: 95,
      stepRank: 3,
    },
    {
      id: 'delivered',
      stage: isPickup ? '05 · Collected' : '05 · Delivered',
      title: isPickup ? 'Picked Up & Signed In-Store' : 'Delivered to Recipient',
      description: isPickup
        ? 'Order handed over in person at Sport Castle Phnom Penh.'
        : `Handed directly to ${order.customer.fullName} with 30-day size exchange guarantee.`,
      location: isPickup ? branchName : `${order.customer.khan}, Phnom Penh`,
      offsetMinutes: 145,
      stepRank: 4,
    },
  ];

  // Map order.status rank (1..4) onto the 5 milestone rows (0..4)
  const currentMilestoneIdx =
    rank === 4 ? 4 : rank === 3 ? 3 : rank === 2 ? 1 : 0;

  return rawSteps.map((step, idx) => {
    let state: TrackingMilestone['state'];
    if (rank === 4) {
      state = 'completed';
    } else if (idx < currentMilestoneIdx) {
      state = 'completed';
    } else if (idx === currentMilestoneIdx) {
      state = 'current';
    } else {
      state = 'upcoming';
    }

    return {
      id: step.id,
      stage: step.stage,
      title: step.title,
      description: step.description,
      location: step.location,
      timestamp:
        state === 'upcoming'
          ? `Est. ${formatOffset(step.offsetMinutes)}`
          : formatOffset(step.offsetMinutes),
      state,
    };
  });
}

export function resolveOrderTracking(
  orderIdInput: string,
  emailInput: string,
  storeOrders: Order[],
  fallbackMemberEmail = 'sokha.chan@phnompenhfc.kh',
): { result: TrackedOrderResult | null; error: string | null } {
  const normalizedId = orderIdInput.trim().toUpperCase().replace(/^#/, '');
  const normalizedEmail = emailInput.trim().toLowerCase();

  // Merge user session orders with built-in sample orders (session orders take priority)
  const mergedOrders: Order[] = [...storeOrders];
  const existingIds = new Set(storeOrders.map((o) => o.id.toUpperCase()));
  for (const demo of getBuiltInTrackableOrders()) {
    if (!existingIds.has(demo.id.toUpperCase())) {
      mergedOrders.push(demo);
    }
  }

  const matched = mergedOrders.find(
    (o) => o.id.toUpperCase() === normalizedId,
  );

  if (!matched) {
    return {
      result: null,
      error: `We could not find order #${normalizedId}. Double-check your receipt ID or try sample order SC-8810 / SC-9024.`,
    };
  }

  const expectedEmail = (matched.customer.email || fallbackMemberEmail)
    .trim()
    .toLowerCase();

  if (expectedEmail && normalizedEmail !== expectedEmail) {
    return {
      result: null,
      error: `Order #${matched.id} was found, but the email address does not match our checkout record. Please verify the email on your receipt.`,
    };
  }

  const milestones = buildShippingTimeline(matched);
  const completedCount = milestones.filter((m) => m.state === 'completed').length;
  const hasCurrent = milestones.some((m) => m.state === 'current');
  const progressPercent =
    matched.status === 'Delivered'
      ? 100
      : Math.min(92, Math.round(((completedCount + (hasCurrent ? 0.5 : 0)) / milestones.length) * 100));

  const destCoords =
    matched.customer.coordinates ??
    (matched.pickupBranch
      ? BRANCH_COORDINATES[matched.pickupBranch]
      : KHAN_CENTROIDS.find((k) =>
          matched.customer.khan.toLowerCase().includes(k.khan.replace(/^Khan\s+/i, '').toLowerCase()),
        ) ?? BRANCH_COORDINATES.sonthormuk);

  const currentMilestone =
    milestones.find((m) => m.state === 'current') ??
    milestones[milestones.length - 1];

  return {
    error: null,
    result: {
      order: matched,
      carrier:
        matched.fulfillmentMethod === 'pickup'
          ? 'Sport Castle Express Counter'
          : 'Sport Castle Phnom Penh Express Fleet',
      trackingNumber: `SCKH-${matched.id.replace(/[^A-Z0-9]/g, '')}-PP`,
      estimatedWindow:
        matched.status === 'Delivered'
          ? 'Completed & Signed'
          : matched.fulfillmentMethod === 'pickup'
            ? 'Ready in 30 mins · Held for 48 hours'
            : 'Same-Day Phnom Penh Express · 1–2 Hours',
      riderName: matched.fulfillmentMethod === 'pickup' ? 'Atelier Pickup Desk' : 'Sopheaktra K. (Moto #14)',
      riderPhone: '+855 12 889 261',
      currentHub: currentMilestone.location,
      progressPercent,
      milestones,
      destinationCoords: { lat: destCoords.lat, lng: destCoords.lng },
    },
  };
}

/**
 * Computes real great-circle Haversine distance in kilometers between two GPS points.
 */
export function calculateDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Number((2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(2));
}

/**
 * Resolves any real GPS coordinate into the closest Phnom Penh Khan/Sangkat
 * and closest Sport Castle branch with exact Haversine distance.
 */
export function resolvePhnomPenhLocationFromCoords(
  lat: number,
  lng: number,
): PhnomPenhCoordinateMatch {
  const point = { lat, lng };

  let closestKhan = KHAN_CENTROIDS[0];
  let closestKhanDist = Infinity;
  for (const k of KHAN_CENTROIDS) {
    const d = calculateDistanceKm(point, k);
    if (d < closestKhanDist) {
      closestKhanDist = d;
      closestKhan = k;
    }
  }

  let nearestBranchId: BranchId = 'sonthormuk';
  let nearestBranchDist = Infinity;
  for (const branch of BRANCHES) {
    const pos = BRANCH_COORDINATES[branch.id];
    const d = calculateDistanceKm(point, pos);
    if (d < nearestBranchDist) {
      nearestBranchDist = d;
      nearestBranchId = branch.id;
    }
  }

  const nearestBranch =
    BRANCHES.find((b) => b.id === nearestBranchId) ?? BRANCHES[0];

  return {
    khan: closestKhan.khan,
    sangkat: closestKhan.sangkat,
    landmarkHint: closestKhan.landmarkHint,
    nearestBranchId,
    nearestBranchName: nearestBranch.name,
    distanceKm: nearestBranchDist,
    withinPhnomPenh: nearestBranchDist <= 35,
  };
}

const PAYMENT_METHOD_LABELS: Record<Order['paymentMethod'], string> = {
  'aba-khqr': 'ABA KHQR',
  'wing-acleda': 'Wing / ACLEDA',
  card: 'Visa / Mastercard',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
  paypal: 'PayPal',
  cod: 'Cash on Delivery',
};

/**
 * Builds a concise, customer-reassuring summary for a located order on TrackOrderPage,
 * formatting the order date (Phnom Penh ICT), total amount, and full delivery or branch pickup address.
 */
export function buildOrderBriefSummary(order: Order): OrderBriefSummary {
  const parsedDate = new Date(order.createdAt);
  const validDate = !Number.isNaN(parsedDate.getTime());

  const orderDateLabel = validDate
    ? parsedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Phnom_Penh',
      })
    : 'Recent Order';

  const orderTimeLabel = validDate
    ? `${parsedDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Phnom_Penh',
      })} ICT`
    : 'Phnom Penh ICT';

  const itemCount = order.items.reduce(
    (sum, item) => sum + Math.max(1, item.quantity || 1),
    0,
  );

  const isPickup = order.fulfillmentMethod === 'pickup';
  const branch = BRANCHES.find((b) => b.id === (order.pickupBranch ?? 'sonthormuk'));

  let addressPrimary: string;
  let addressSecondary: string;

  if (isPickup && branch) {
    addressPrimary = branch.name;
    addressSecondary = branch.address;
  } else {
    const street = order.customer.streetAddress?.trim();
    const areaParts = [
      order.customer.sangkat?.trim(),
      order.customer.khan?.trim(),
      'Phnom Penh',
    ].filter(Boolean);

    addressPrimary = street || areaParts[0] || 'Phnom Penh Delivery';
    addressSecondary = street
      ? areaParts.join(', ')
      : areaParts.slice(1).join(', ') || 'Phnom Penh, Cambodia';
  }

  const reassuranceByStatus: Record<Order['status'], string> = {
    Confirmed:
      'Your order is verified and stock is reserved in our Phnom Penh dispatch system.',
    'Heat-Press Printing':
      'Your order is verified and currently in our Sonthormuk customization lab.',
    'Rider Dispatched':
      'Your order is verified and on the road with our Phnom Penh express courier.',
    Delivered:
      isPickup
        ? 'Your order has been collected in-store — covered by our 30-day size exchange guarantee.'
        : 'Your order has been delivered — covered by our 30-day size exchange guarantee.',
  };

  return {
    orderId: order.id,
    orderDateLabel,
    orderTimeLabel,
    totalUsd: order.totalUsd,
    totalKhr: order.totalKhr || Math.round(order.totalUsd * 4100),
    itemCount,
    paymentLabel:
      PAYMENT_METHOD_LABELS[order.paymentMethod] ??
      order.paymentMethod.replace('-', ' ').toUpperCase(),
    addressHeading: isPickup ? 'Pickup Branch Address' : 'Delivery Address',
    recipientName: order.customer.fullName || 'Sport Castle Customer',
    addressPrimary,
    addressSecondary,
    reassuranceNote: reassuranceByStatus[order.status],
  };
}

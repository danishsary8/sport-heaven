import { BRANCHES } from '../data/catalog';
import type {
  BranchId,
  BranchInfo,
  CartItem,
  Product,
} from '../types/store';

export type BranchAvailabilityStatus =
  | 'ready-fast'
  | 'limited-stock'
  | 'branch-transfer';

export interface BranchPickupEstimate {
  branch: BranchInfo;
  branchId: BranchId;
  availabilityStatus: BranchAvailabilityStatus;
  stockSummaryLabel: string;
  inStockCount: number;
  limitedStockCount: number;
  transferCount: number;
  hasCustomPrint: boolean;
  estimatedMinutes: number;
  durationLabel: string;
  readyWindowLabel: string;
  readyHeadline: string;
  availabilityNote: string;
  isOpenNow: boolean;
  isRecommendedFastest: boolean;
}

const OPEN_MINUTES_ICT = 8 * 60 + 30; // 08:30 ICT
const CLOSE_MINUTES_ICT = 20 * 60 + 30; // 20:30 ICT
const LAST_SAME_DAY_READY_ICT = 20 * 60 + 15; // 20:15 ICT

const BRANCH_TIMING_PROFILE: Record<
  BranchId,
  {
    basePrepMinutes: number;
    heatPressExtraMinutes: number;
    transferExtraMinutes: number;
  }
> = {
  sonthormuk: {
    basePrepMinutes: 25,
    heatPressExtraMinutes: 15,
    transferExtraMinutes: 35,
  },
  sensok: {
    basePrepMinutes: 35,
    heatPressExtraMinutes: 25,
    transferExtraMinutes: 75,
  },
  chomkadong: {
    basePrepMinutes: 45,
    heatPressExtraMinutes: 75,
    transferExtraMinutes: 95,
  },
};

export function getPhnomPenhClockMinutes(now: Date = new Date()): {
  hour: number;
  minute: number;
  totalMinutes: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Phnom_Penh',
  });
  const parts = formatter.formatToParts(now);
  const rawHour = Number(parts.find((p) => p.type === 'hour')?.value ?? '10');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

export function formatIctClockTime(totalMinutesFromMidnight: number): string {
  const normalized =
    ((Math.round(totalMinutesFromMidnight) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const paddedMins = String(mins).padStart(2, '0');
  return `${hours12}:${paddedMins} ${period} ICT`;
}

export function formatPickupDuration(minutes: number): string {
  const safeMins = Math.max(15, Math.round(minutes));
  if (safeMins < 60) {
    return `~${safeMins} mins`;
  }
  const hrs = Math.floor(safeMins / 60);
  const rem = safeMins % 60;
  if (rem === 0) {
    return `~${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  }
  return `~${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${rem} mins`;
}

/**
 * Computes deterministic, location-specific store pickup availability & ready time
 * for one of Sport Castle's 3 physical Phnom Penh branches.
 */
export function calculateBranchPickupEstimate(
  branch: BranchInfo,
  cart: readonly CartItem[],
  catalog: readonly Product[],
  now: Date = new Date(),
): BranchPickupEstimate {
  const profile = BRANCH_TIMING_PROFILE[branch.id];
  const productById = new Map(catalog.map((p) => [p.id, p]));

  let inStockCount = 0;
  let limitedStockCount = 0;
  let transferCount = 0;

  for (const item of cart) {
    const product = productById.get(item.productId);
    const level = product?.branchStock[branch.id] ?? 'In Stock';
    if (level === 'Out of Stock') {
      transferCount += 1;
    } else if (level === 'Limited Stock') {
      limitedStockCount += 1;
    } else {
      inStockCount += 1;
    }
  }

  const hasCustomPrint = cart.some((item) => item.customPrint?.enabled);
  const itemCount = cart.length;

  let estimatedMinutes = profile.basePrepMinutes;
  if (hasCustomPrint) {
    estimatedMinutes += profile.heatPressExtraMinutes;
  }
  if (transferCount > 0) {
    estimatedMinutes += profile.transferExtraMinutes;
  }

  const availabilityStatus: BranchAvailabilityStatus =
    transferCount > 0
      ? 'branch-transfer'
      : limitedStockCount > 0
        ? 'limited-stock'
        : 'ready-fast';

  let stockSummaryLabel: string;
  if (itemCount === 0) {
    stockSummaryLabel = 'Ready for express counter pickup';
  } else if (transferCount > 0) {
    stockSummaryLabel =
      transferCount === 1
        ? '1 item shuttled from Flagship HQ'
        : `${transferCount} items shuttled from Flagship HQ`;
  } else if (limitedStockCount > 0) {
    stockSummaryLabel =
      limitedStockCount === 1
        ? 'Limited stock on 1 item · held upon checkout'
        : `Limited stock on ${limitedStockCount} items · held upon checkout`;
  } else {
    stockSummaryLabel =
      itemCount === 1
        ? 'In stock at this branch'
        : `All ${itemCount} items in stock here`;
  }

  const clock = getPhnomPenhClockMinutes(now);
  const isOpenNow =
    clock.totalMinutes >= OPEN_MINUTES_ICT &&
    clock.totalMinutes < CLOSE_MINUTES_ICT;

  const durationLabel = formatPickupDuration(estimatedMinutes);
  let readyWindowLabel: string;
  let readyHeadline: string;

  if (clock.totalMinutes < OPEN_MINUTES_ICT) {
    const readyAt = OPEN_MINUTES_ICT + estimatedMinutes;
    readyWindowLabel = `Today by ${formatIctClockTime(readyAt)}`;
    readyHeadline = `Ready today by ${formatIctClockTime(readyAt)} (${durationLabel} after 8:30 AM open)`;
  } else if (clock.totalMinutes + estimatedMinutes <= LAST_SAME_DAY_READY_ICT) {
    const readyAt = clock.totalMinutes + estimatedMinutes;
    readyWindowLabel = `Today by ${formatIctClockTime(readyAt)}`;
    readyHeadline = `Ready today by ${formatIctClockTime(readyAt)} (${durationLabel})`;
  } else {
    const morningReadyAt = OPEN_MINUTES_ICT + Math.min(estimatedMinutes, 60);
    readyWindowLabel = `Tomorrow by ${formatIctClockTime(morningReadyAt)}`;
    readyHeadline = `Ready tomorrow by ${formatIctClockTime(morningReadyAt)} (Opens 8:30 AM)`;
  }

  const noteParts: string[] = [];
  if (transferCount > 0) {
    noteParts.push(
      `Includes Phnom Penh inter-branch shuttle from Sonthormuk Flagship.`,
    );
  }
  if (hasCustomPrint) {
    noteParts.push(
      branch.id === 'chomkadong'
        ? 'Custom TPU heat-press completed at Sonthormuk Lab before south drop.'
        : `Custom TPU heat-press completed in-store (${branch.heatPressWait}).`,
    );
  }
  if (noteParts.length === 0) {
    noteParts.push(
      `Counter pickup with on-site boot & jersey fit verification (${branch.hours}).`,
    );
  }

  return {
    branch,
    branchId: branch.id,
    availabilityStatus,
    stockSummaryLabel,
    inStockCount,
    limitedStockCount,
    transferCount,
    hasCustomPrint,
    estimatedMinutes,
    durationLabel,
    readyWindowLabel,
    readyHeadline,
    availabilityNote: noteParts.join(' '),
    isOpenNow,
    isRecommendedFastest: false,
  };
}

export function buildAllBranchPickupEstimates(
  cart: readonly CartItem[],
  catalog: readonly Product[],
  now: Date = new Date(),
): BranchPickupEstimate[] {
  const estimates = BRANCHES.map((branch) =>
    calculateBranchPickupEstimate(branch, cart, catalog, now),
  );
  if (estimates.length === 0) return [];

  let minMinutes = estimates[0].estimatedMinutes;
  let fastestIndex = 0;
  for (let i = 1; i < estimates.length; i += 1) {
    if (estimates[i].estimatedMinutes < minMinutes) {
      minMinutes = estimates[i].estimatedMinutes;
      fastestIndex = i;
    }
  }

  return estimates.map((estimate, index) => ({
    ...estimate,
    isRecommendedFastest: index === fastestIndex,
  }));
}

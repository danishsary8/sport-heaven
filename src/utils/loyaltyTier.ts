import type { Order } from '../types/store';
import { sortOrdersByNewest } from './orderHistory.ts';

export type LoyaltyTierId = 'bronze' | 'silver' | 'gold' | 'pro';
export type LoyaltyTierName =
  | 'Bronze Member'
  | 'Silver Member'
  | 'Gold Member'
  | 'Pro Member';

export const POINTS_PER_USD = 10;
export const BRONZE_SPEND_THRESHOLD = 0;
export const SILVER_SPEND_THRESHOLD = 150;
export const GOLD_SPEND_THRESHOLD = 300;
export const PRO_MEMBER_SPEND_THRESHOLD = 500;
export const PRO_MEMBER_POINTS_THRESHOLD =
  PRO_MEMBER_SPEND_THRESHOLD * POINTS_PER_USD;

export interface LoyaltyTierDefinition {
  id: LoyaltyTierId;
  badgeLabel: 'Bronze' | 'Silver' | 'Gold' | 'Pro';
  name: LoyaltyTierName;
  minSpendUsd: number;
  minPoints: number;
  milestonePct: number;
  headlinePerk: string;
  achievementTitle: string;
  shortSummary: string;
  perks: readonly string[];
}

export const LOYALTY_TIERS: readonly LoyaltyTierDefinition[] = [
  {
    id: 'bronze',
    badgeLabel: 'Bronze',
    name: 'Bronze Member',
    minSpendUsd: BRONZE_SPEND_THRESHOLD,
    minPoints: BRONZE_SPEND_THRESHOLD * POINTS_PER_USD,
    milestonePct: 0,
    headlinePerk: 'Saved Fit Profile & Live Tracking',
    achievementTitle: 'Club Entry Unlocked',
    shortSummary: 'Base membership unlocked upon joining Sport Castle Club.',
    perks: [
      'Saved EU boot & jersey fit preferences across catalog',
      'Live Phnom Penh order & heat-press tracking',
    ],
  },
  {
    id: 'silver',
    badgeLabel: 'Silver',
    name: 'Silver Member',
    minSpendUsd: SILVER_SPEND_THRESHOLD,
    minPoints: SILVER_SPEND_THRESHOLD * POINTS_PER_USD,
    milestonePct: 30,
    headlinePerk: '10% Member Discount',
    achievementTitle: 'Silver Milestone Achieved',
    shortSummary: 'Unlocked at $150 lifetime spend (1,500 pts).',
    perks: [
      '10% discount on eligible match kits, boots & accessories',
      'Early access to 2026/27 UCL & national team kit drops',
    ],
  },
  {
    id: 'gold',
    badgeLabel: 'Gold',
    name: 'Gold Member',
    minSpendUsd: GOLD_SPEND_THRESHOLD,
    minPoints: GOLD_SPEND_THRESHOLD * POINTS_PER_USD,
    milestonePct: 60,
    headlinePerk: 'Free Express Shipping',
    achievementTitle: 'Gold Milestone Achieved',
    shortSummary: 'Unlocked at $300 lifetime spend (3,000 pts).',
    perks: [
      'Free same-day Phnom Penh shipping on every order',
      'Priority studio dispatch & restock alerts on saved gear',
    ],
  },
  {
    id: 'pro',
    badgeLabel: 'Pro',
    name: 'Pro Member',
    minSpendUsd: PRO_MEMBER_SPEND_THRESHOLD,
    minPoints: PRO_MEMBER_POINTS_THRESHOLD,
    milestonePct: 100,
    headlinePerk: 'Free Heat-Press & VIP Fitting',
    achievementTitle: 'Pro Member Status Unlocked',
    shortSummary: 'Top status unlocked at $500 lifetime spend (5,000 pts).',
    perks: [
      'Complimentary official heat-press name, number & patch printing',
      'Priority boot fitting reservations at all 3 Phnom Penh branches',
      'Exclusive invites to limited-edition & retro jersey drops',
    ],
  },
] as const;

export interface LoyaltyMilestoneStatus {
  id: LoyaltyTierId;
  badgeLabel: 'Bronze' | 'Silver' | 'Gold' | 'Pro';
  name: LoyaltyTierName;
  minSpendUsd: number;
  minPoints: number;
  milestonePct: number;
  headlinePerk: string;
  achievementTitle: string;
  shortSummary: string;
  perks: readonly string[];
  reached: boolean;
  isCurrent: boolean;
  isTarget: boolean;
  remainingUsd: number;
  remainingPoints: number;
}

export interface LoyaltyOrderContribution {
  orderId: string;
  createdAt: string;
  status: Order['status'];
  itemCount: number;
  totalUsd: number;
  pointsEarned: number;
  shareOfProPct: number;
}

export interface ProMemberProgress {
  orderCount: number;
  totalItemsPurchased: number;
  totalSpentUsd: number;
  points: number;
  currentTier: LoyaltyTierDefinition;
  nextTier: LoyaltyTierDefinition | null;
  achievedMilestoneCount: number;
  totalMilestoneCount: number;
  proThresholdUsd: number;
  proThresholdPoints: number;
  isProMember: boolean;
  progressToProPct: number;
  amountRemainingToProUsd: number;
  pointsRemainingToPro: number;
  milestones: readonly LoyaltyMilestoneStatus[];
  reachedMilestones: readonly LoyaltyMilestoneStatus[];
  orderContributions: readonly LoyaltyOrderContribution[];
}

function sanitizeUsd(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Number(value.toFixed(2));
}

/**
 * Calculates a member's loyalty tier status, interval milestones (Bronze,
 * Silver, Gold, Pro), and exact progress toward 'Pro Member' ($500 lifetime
 * spend / 5,000 pts) from their purchase history.
 */
export function calculateProMemberProgress(
  orders: readonly Order[],
): ProMemberProgress {
  const sortedOrders = sortOrdersByNewest(orders);

  let rawSpent = 0;
  let totalItemsPurchased = 0;

  const orderContributions: LoyaltyOrderContribution[] = sortedOrders.map(
    (order) => {
      const orderUsd = sanitizeUsd(order.totalUsd);
      const itemCount = order.items.reduce(
        (sum, item) => sum + Math.max(0, item.quantity),
        0,
      );
      rawSpent += orderUsd;
      totalItemsPurchased += itemCount;

      const pointsEarned = Math.round(orderUsd * POINTS_PER_USD);
      const shareOfProPct = Math.min(
        100,
        Math.round((orderUsd / PRO_MEMBER_SPEND_THRESHOLD) * 100),
      );

      return {
        orderId: order.id,
        createdAt: order.createdAt,
        status: order.status,
        itemCount,
        totalUsd: orderUsd,
        pointsEarned,
        shareOfProPct,
      };
    },
  );

  const totalSpentUsd = Number(rawSpent.toFixed(2));
  const points = Math.round(totalSpentUsd * POINTS_PER_USD);
  const isProMember = totalSpentUsd >= PRO_MEMBER_SPEND_THRESHOLD;

  let currentTierIndex = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i -= 1) {
    if (totalSpentUsd >= LOYALTY_TIERS[i].minSpendUsd) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = LOYALTY_TIERS[currentTierIndex];
  const nextTier =
    currentTierIndex < LOYALTY_TIERS.length - 1
      ? LOYALTY_TIERS[currentTierIndex + 1]
      : null;

  const amountRemainingToProUsd = isProMember
    ? 0
    : Number(
        Math.max(0, PRO_MEMBER_SPEND_THRESHOLD - totalSpentUsd).toFixed(2),
      );

  const pointsRemainingToPro = isProMember
    ? 0
    : Math.max(0, PRO_MEMBER_POINTS_THRESHOLD - points);

  // Never round up to 100% until the user has genuinely reached the $500 Pro Member threshold
  const progressToProPct = isProMember
    ? 100
    : totalSpentUsd <= 0
      ? 0
      : Math.min(
          99,
          Math.max(
            1,
            Math.round((totalSpentUsd / PRO_MEMBER_SPEND_THRESHOLD) * 100),
          ),
        );

  const milestones: LoyaltyMilestoneStatus[] = LOYALTY_TIERS.map(
    (tier, idx) => {
      const reached = totalSpentUsd >= tier.minSpendUsd;
      const remainingUsd = reached
        ? 0
        : Number(Math.max(0, tier.minSpendUsd - totalSpentUsd).toFixed(2));
      const remainingPoints = reached
        ? 0
        : Math.max(0, tier.minPoints - points);

      return {
        id: tier.id,
        badgeLabel: tier.badgeLabel,
        name: tier.name,
        minSpendUsd: tier.minSpendUsd,
        minPoints: tier.minPoints,
        milestonePct: tier.milestonePct,
        headlinePerk: tier.headlinePerk,
        achievementTitle: tier.achievementTitle,
        shortSummary: tier.shortSummary,
        perks: tier.perks,
        reached,
        isCurrent: idx === currentTierIndex,
        isTarget: !isProMember && tier.id === 'pro',
        remainingUsd,
        remainingPoints,
      };
    },
  );

  const reachedMilestones = milestones.filter((m) => m.reached);
  const achievedMilestoneCount = reachedMilestones.length;

  return {
    orderCount: sortedOrders.length,
    totalItemsPurchased,
    totalSpentUsd,
    points,
    currentTier,
    nextTier,
    achievedMilestoneCount,
    totalMilestoneCount: LOYALTY_TIERS.length,
    proThresholdUsd: PRO_MEMBER_SPEND_THRESHOLD,
    proThresholdPoints: PRO_MEMBER_POINTS_THRESHOLD,
    isProMember,
    progressToProPct,
    amountRemainingToProUsd,
    pointsRemainingToPro,
    milestones,
    reachedMilestones,
    orderContributions,
  };
}

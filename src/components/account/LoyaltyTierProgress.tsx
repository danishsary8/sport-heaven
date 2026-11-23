import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Medal,
  Shield,
  Trophy,
} from 'lucide-react';
import type { Order, PageRoute } from '../../types/store';
import { formatUsd } from '../../utils/commerce';
import { formatOrderDate } from '../../utils/orderHistory';
import {
  LOYALTY_TIERS,
  calculateProMemberProgress,
  type LoyaltyMilestoneStatus,
  type LoyaltyTierId,
} from '../../utils/loyaltyTier';

interface LoyaltyTierProgressProps {
  orders: readonly Order[];
  onNavigate: (next: PageRoute) => void;
}

interface MilestoneBadgeTheme {
  unlockedNode: string;
  currentNode: string;
  lockedNode: string;
  accentText: string;
  calloutBorder: string;
  calloutBg: string;
}

const MILESTONE_THEMES: Record<LoyaltyTierId, MilestoneBadgeTheme> = {
  bronze: {
    unlockedNode: 'border-[#9A5B32] bg-[#9A5B32] text-[#FDFCF9]',
    currentNode:
      'border-[#9A5B32] bg-[#9A5B32] text-[#FDFCF9] ring-2 ring-[#9A5B32]/30 ring-offset-2 ring-offset-[#FDFCF9]',
    lockedNode: 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#5A5D57]',
    accentText: 'text-[#8C4F28]',
    calloutBorder: 'border-[#9A5B32]/25',
    calloutBg: 'bg-[#F8F3EE]',
  },
  silver: {
    unlockedNode: 'border-[#5B6570] bg-[#5B6570] text-[#FDFCF9]',
    currentNode:
      'border-[#5B6570] bg-[#5B6570] text-[#FDFCF9] ring-2 ring-[#5B6570]/30 ring-offset-2 ring-offset-[#FDFCF9]',
    lockedNode: 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#5A5D57]',
    accentText: 'text-[#4B5560]',
    calloutBorder: 'border-[#5B6570]/25',
    calloutBg: 'bg-[#F3F5F7]',
  },
  gold: {
    unlockedNode: 'border-[#B8933B] bg-[#B8933B] text-[#FDFCF9]',
    currentNode:
      'border-[#B8933B] bg-[#B8933B] text-[#FDFCF9] ring-2 ring-[#B8933B]/35 ring-offset-2 ring-offset-[#FDFCF9]',
    lockedNode: 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#5A5D57]',
    accentText: 'text-[#8F6E1E]',
    calloutBorder: 'border-[#B8933B]/35',
    calloutBg: 'bg-[#FAF6EB]',
  },
  pro: {
    unlockedNode: 'border-[#0E1113] bg-[#0E1113] text-[#D8B458]',
    currentNode:
      'border-[#0E1113] bg-[#0E1113] text-[#D8B458] ring-2 ring-[#B8933B]/45 ring-offset-2 ring-offset-[#FDFCF9]',
    lockedNode: 'border-[#0E1113]/30 bg-[#FDFCF9] text-[#0E1113]/75',
    accentText: 'text-[#0E1113]',
    calloutBorder: 'border-[#0E1113]/20',
    calloutBg: 'bg-[#F4F2EC]',
  },
};

function MilestoneEmblem({
  tierId,
  className = 'h-3.5 w-3.5',
}: {
  tierId: LoyaltyTierId;
  className?: string;
}) {
  switch (tierId) {
    case 'bronze':
      return <Shield className={className} aria-hidden="true" />;
    case 'silver':
      return <Medal className={className} aria-hidden="true" />;
    case 'gold':
      return <Trophy className={className} aria-hidden="true" />;
    case 'pro':
    default:
      return <Crown className={className} aria-hidden="true" />;
  }
}

function getTrackPositionClass(milestonePct: number): string {
  if (milestonePct <= 0) return 'left-0';
  if (milestonePct >= 100) return 'right-0';
  if (milestonePct === 30) return 'left-[30%] -translate-x-1/2';
  if (milestonePct === 60) return 'left-[60%] -translate-x-1/2';
  return '-translate-x-1/2';
}

export function LoyaltyTierProgress({
  orders,
  onNavigate,
}: LoyaltyTierProgressProps) {
  const [showDetails, setShowDetails] = useState(false);

  const progress = useMemo(
    () => calculateProMemberProgress(orders),
    [orders],
  );

  const [inspectedTierId, setInspectedTierId] = useState<LoyaltyTierId>(
    progress.currentTier.id,
  );

  // Sync inspected badge whenever the user crosses into a new loyalty tier
  useEffect(() => {
    setInspectedTierId(progress.currentTier.id);
  }, [progress.currentTier.id]);

  const inspectedMilestone: LoyaltyMilestoneStatus =
    progress.milestones.find((m) => m.id === inspectedTierId) ??
    progress.milestones[progress.milestones.length - 1];
  const inspectedTheme = MILESTONE_THEMES[inspectedMilestone.id];
  const proTier = LOYALTY_TIERS[LOYALTY_TIERS.length - 1];

  return (
    <section
      aria-labelledby="loyalty-tier-heading"
      data-testid="loyalty-tier-progress"
      data-tier={progress.currentTier.id}
      data-pro-unlocked={String(progress.isProMember)}
      className="mt-8 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-8"
    >
      {/* Top Summary Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#0E1113]/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
            Sport Castle Club · {progress.currentTier.name} ·{' '}
            {progress.achievedMilestoneCount}/{progress.totalMilestoneCount}{' '}
            Milestones
          </p>
          <h2
            id="loyalty-tier-heading"
            className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[#0E1113] uppercase sm:text-3xl"
          >
            {progress.isProMember
              ? 'Pro Member Status Unlocked'
              : 'Progress Toward Pro Member'}
          </h2>
          <p className="mt-1.5 text-xs text-[#5A5D57]">
            {progress.orderCount === 0
              ? `Place your first order to start unlocking Bronze, Silver, Gold, and Pro Member milestones (${formatUsd(progress.proThresholdUsd)} lifetime spend).`
              : progress.isProMember
                ? `All ${progress.totalMilestoneCount} loyalty milestones unlocked across ${progress.orderCount} qualifying ${progress.orderCount === 1 ? 'order' : 'orders'} (${progress.points.toLocaleString('en-US')} pts).`
                : `Calculated from ${progress.orderCount} qualifying ${progress.orderCount === 1 ? 'order' : 'orders'} · ${formatUsd(progress.amountRemainingToProUsd)} (${progress.pointsRemainingToPro.toLocaleString('en-US')} pts) away from Pro Member.`}
          </p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:text-right">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#5A5D57] uppercase">
              Qualifying Spend
            </p>
            <p
              data-testid="loyalty-spend-readout"
              className="mt-0.5 font-mono text-xl font-bold text-[#0E1113] tabular-nums sm:text-2xl"
            >
              {formatUsd(progress.totalSpentUsd)}
              <span className="text-xs font-normal text-[#5A5D57]">
                {' '}
                / {formatUsd(progress.proThresholdUsd)}
              </span>
            </p>
          </div>
          <div className="border-l border-[#0E1113]/12 pl-4">
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#5A5D57] uppercase">
              Pro Progress
            </p>
            <p
              data-testid="loyalty-progress-pct"
              className={`mt-0.5 font-mono text-xl font-bold tabular-nums sm:text-2xl ${
                progress.isProMember ? 'text-[#0E1113]' : 'text-[#9A7422]'
              }`}
            >
              {progress.progressToProPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar Track with Anchored Bronze / Silver / Gold / Pro Milestone Badges */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-bold text-[#0E1113] uppercase">
            <Award
              className="h-3.5 w-3.5 text-[#B8933B]"
              aria-hidden="true"
            />
            <span>Current Tier: {progress.currentTier.name}</span>
          </span>
          <span className="text-[#5A5D57] tabular-nums">
            {progress.points.toLocaleString('en-US')} /{' '}
            {progress.proThresholdPoints.toLocaleString('en-US')} PTS
          </span>
        </div>

        {/* Visual Track + Interval Milestone Badge Nodes */}
        <div className="relative mt-5 flex items-center py-3">
          {/* Accessible Progress Bar Rail */}
          <div
            role="progressbar"
            aria-label="Progress toward Pro Member status"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.progressToProPct}
            aria-valuetext={`${progress.progressToProPct}% toward Pro Member (${formatUsd(progress.totalSpentUsd)} of ${formatUsd(progress.proThresholdUsd)} spent, ${progress.achievedMilestoneCount} of ${progress.totalMilestoneCount} milestones unlocked)`}
            data-testid="loyalty-progressbar-track"
            className="h-2.5 w-full overflow-hidden border border-[#0E1113]/15 bg-[#EAE7DF]"
          >
            <div
              data-testid="loyalty-progressbar-fill"
              className={`h-full transition-[width] duration-500 motion-reduce:transition-none ${
                progress.isProMember
                  ? 'bg-[#0E1113]'
                  : 'bg-gradient-to-r from-[#9A5B32] via-[#7A7D80] to-[#B8933B]'
              }`}
              style={{ width: `${progress.progressToProPct}%` }}
            />
          </div>

          {/* Interactive Milestone Badges Positioned Directly Along the Track */}
          {progress.milestones.map((milestone) => {
            const theme = MILESTONE_THEMES[milestone.id];
            const isSelected = inspectedMilestone.id === milestone.id;
            const nodeStyle = milestone.isCurrent
              ? theme.currentNode
              : milestone.reached
                ? theme.unlockedNode
                : theme.lockedNode;

            return (
              <button
                key={milestone.id}
                type="button"
                data-testid={`loyalty-milestone-badge-${milestone.id}`}
                data-milestone-id={milestone.id}
                data-reached={String(milestone.reached)}
                data-current={String(milestone.isCurrent)}
                aria-pressed={isSelected}
                aria-label={`${milestone.badgeLabel} milestone badge (${formatUsd(milestone.minSpendUsd)}) — ${milestone.isCurrent ? 'Current tier unlocked' : milestone.reached ? 'Unlocked' : `${formatUsd(milestone.remainingUsd)} remaining`}`}
                onClick={() => setInspectedTierId(milestone.id)}
                className={`group absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center border transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E1113] motion-reduce:transition-none sm:h-9 sm:w-9 ${getTrackPositionClass(milestone.milestonePct)} ${nodeStyle} ${
                  isSelected && !milestone.isCurrent
                    ? 'ring-2 ring-[#0E1113]/35 ring-offset-2 ring-offset-[#FDFCF9]'
                    : ''
                }`}
              >
                <MilestoneEmblem
                  tierId={milestone.id}
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                />
                {milestone.reached && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center border border-[#FDFCF9] bg-[#0E1113] text-[#FDFCF9]"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop Proportional Milestone Labels Directly Under Badges */}
        <ol
          aria-label="Loyalty tier milestones"
          className="relative mt-2 hidden h-10 sm:block"
        >
          {progress.milestones.map((milestone) => {
            const theme = MILESTONE_THEMES[milestone.id];
            const isSelected = inspectedMilestone.id === milestone.id;
            const alignClass =
              milestone.milestonePct <= 0
                ? 'left-0 text-left'
                : milestone.milestonePct >= 100
                  ? 'right-0 text-right'
                  : milestone.milestonePct === 30
                    ? 'left-[30%] -translate-x-1/2 text-center'
                    : 'left-[60%] -translate-x-1/2 text-center';

            return (
              <li
                key={milestone.id}
                data-milestone-label={milestone.id}
                data-reached={String(milestone.reached)}
                className={`absolute top-0 ${alignClass}`}
              >
                <button
                  type="button"
                  onClick={() => setInspectedTierId(milestone.id)}
                  className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E1113]"
                >
                  <span
                    className={`block font-mono text-[10px] font-bold tracking-[0.12em] uppercase transition-colors ${
                      milestone.isCurrent || isSelected
                        ? theme.accentText
                        : milestone.reached
                          ? 'text-[#0E1113]'
                          : 'text-[#5A5D57] group-hover:text-[#0E1113]'
                    }`}
                  >
                    {milestone.badgeLabel}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] whitespace-nowrap text-[#5A5D57] tabular-nums">
                    {formatUsd(milestone.minSpendUsd)}
                    {milestone.isCurrent
                      ? ' · Active'
                      : milestone.reached
                        ? ' · Unlocked'
                        : ' · Goal'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Mobile Clean 4-Column Milestone Strip (zero overlap on narrow screens) */}
        <ol
          aria-label="Loyalty tier milestones mobile"
          className="mt-2 grid grid-cols-4 gap-1.5 sm:hidden"
        >
          {progress.milestones.map((milestone, idx) => {
            const theme = MILESTONE_THEMES[milestone.id];
            const isSelected = inspectedMilestone.id === milestone.id;
            const align =
              idx === 0
                ? 'text-left'
                : idx === 3
                  ? 'text-right'
                  : 'text-center';

            return (
              <li key={milestone.id} className={align}>
                <button
                  type="button"
                  onClick={() => setInspectedTierId(milestone.id)}
                  className="w-full py-1"
                >
                  <span
                    className={`block font-mono text-[10px] font-bold tracking-[0.06em] uppercase ${
                      milestone.isCurrent || isSelected
                        ? theme.accentText
                        : milestone.reached
                          ? 'text-[#0E1113]'
                          : 'text-[#5A5D57]'
                    }`}
                  >
                    {milestone.badgeLabel}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-[#5A5D57] tabular-nums">
                    ${milestone.minSpendUsd}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Exclusive Perks for Each Reached Tier */}
        <div
          data-testid="unlocked-tier-perks-section"
          aria-labelledby="unlocked-tier-perks-heading"
          className="mt-6 border-t border-[#0E1113]/10 pt-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3
              id="unlocked-tier-perks-heading"
              className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#0E1113] uppercase"
            >
              Exclusive Perks Unlocked ({progress.reachedMilestones.length}/
              {progress.totalMilestoneCount} Tiers)
            </h3>
            <span className="font-mono text-[10px] text-[#5A5D57] uppercase">
              Active automatically at checkout
            </span>
          </div>

          <ul
            aria-label="Unlocked loyalty tier perks"
            className={`mt-3.5 grid grid-cols-1 gap-3 ${
              progress.reachedMilestones.length === 1
                ? 'sm:grid-cols-1'
                : progress.reachedMilestones.length === 2
                  ? 'sm:grid-cols-2'
                  : progress.reachedMilestones.length === 3
                    ? 'md:grid-cols-3'
                    : 'sm:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {progress.reachedMilestones.map((tier) => {
              const theme = MILESTONE_THEMES[tier.id];
              const isHighlighted = inspectedMilestone.id === tier.id;

              return (
                <li
                  key={tier.id}
                  data-testid={`unlocked-perk-card-${tier.id}`}
                  data-tier-id={tier.id}
                  data-current={String(tier.isCurrent)}
                  className={`flex flex-col justify-between border p-4 transition-colors ${
                    isHighlighted
                      ? `${theme.calloutBorder} ${theme.calloutBg}`
                      : 'border-[#0E1113]/12 bg-[#F4F2EC]/55'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center border ${theme.unlockedNode}`}
                        >
                          <MilestoneEmblem
                            tierId={tier.id}
                            className="h-3 w-3"
                          />
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold tracking-[0.14em] uppercase ${theme.accentText}`}
                        >
                          {tier.badgeLabel}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#5A5D57] uppercase tabular-nums">
                        {tier.isCurrent
                          ? 'Active Tier'
                          : `Unlocked · $${tier.minSpendUsd}`}
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-bold tracking-tight text-[#0E1113]">
                      {tier.headlinePerk}
                    </p>

                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#5A5D57]">
                      {tier.perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-1.5">
                          <Check
                            className={`mt-0.5 h-3 w-3 shrink-0 ${theme.accentText}`}
                            aria-hidden="true"
                          />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Upcoming Tier Preview Callout when inspecting a locked milestone badge (e.g. Pro) */}
          {!inspectedMilestone.reached && (
            <div
              data-testid="loyalty-milestone-callout"
              data-inspected-tier={inspectedMilestone.id}
              className={`mt-3 flex flex-col justify-between gap-3 border px-4 py-3.5 sm:flex-row sm:items-center ${inspectedTheme.calloutBorder} ${inspectedTheme.calloutBg}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border ${inspectedTheme.lockedNode}`}
                >
                  <MilestoneEmblem
                    tierId={inspectedMilestone.id}
                    className="h-3.5 w-3.5"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
                    <span className={inspectedTheme.accentText}>
                      Up Next: {inspectedMilestone.name}
                    </span>
                    <span aria-hidden="true" className="text-[#5A5D57]">
                      ·
                    </span>
                    <span className="text-[#5A5D57] tabular-nums">
                      {formatUsd(inspectedMilestone.remainingUsd)} (
                      {inspectedMilestone.remainingPoints.toLocaleString('en-US')}{' '}
                      pts) to unlock
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[#0E1113]">
                    {inspectedMilestone.headlinePerk} —{' '}
                    <span className="font-normal text-[#5A5D57]">
                      {inspectedMilestone.perks.join(' · ')}
                    </span>
                  </p>
                </div>
              </div>

              <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.12em] text-[#5A5D57] uppercase tabular-nums sm:text-right">
                {inspectedMilestone.minPoints.toLocaleString('en-US')} PTS Tier
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action & Breakdown Toggle Strip */}
      <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#0E1113]/10 pt-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#5A5D57]">
          {progress.isProMember ? (
            <span className="font-semibold text-[#0E1113]">
              All tier perks active: 10% member discount · Free shipping · Free heat-press &amp; VIP fitting
            </span>
          ) : (
            <span>
              Next unlock:{' '}
              <strong className="font-bold text-[#0E1113]">
                {progress.nextTier?.name ?? 'Pro Member'}
              </strong>{' '}
              — {progress.nextTier?.headlinePerk ?? proTier.headlinePerk}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-expanded={showDetails}
            aria-controls="loyalty-tier-breakdown"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 border border-[#0E1113]/20 bg-[#FDFCF9] px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#0E1113] uppercase whitespace-nowrap transition hover:border-[#0E1113]"
          >
            <span>
              {showDetails ? 'Hide Breakdown' : 'Order Points Breakdown'}
            </span>
            {showDetails ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {!progress.isProMember && (
            <button
              type="button"
              onClick={() =>
                onNavigate({ page: 'shop', collectionSlug: 'all' })
              }
              className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#FDFCF9] uppercase whitespace-nowrap transition hover:bg-[#C8232C]"
            >
              <span>Shop to Earn Points</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Pro Benefits Reference + Purchase History Contribution Table */}
      {showDetails && (
        <div
          id="loyalty-tier-breakdown"
          className="mt-5 grid grid-cols-1 gap-6 border-t border-[#0E1113]/10 pt-5 lg:grid-cols-12"
        >
          {/* Pro Member Full Tier Summary */}
          <div className="lg:col-span-5">
            <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#5A5D57] uppercase">
              Pro Member Exclusive Perks ({formatUsd(proTier.minSpendUsd)} Spend)
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs text-[#0E1113]/85">
              {proTier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      progress.isProMember
                        ? 'text-[#0E1113]'
                        : 'text-[#B8933B]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Qualifying Purchase History Breakdown */}
          <div className="border-t border-[#0E1113]/10 pt-5 lg:col-span-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#5A5D57] uppercase">
                Qualifying Purchase History ({progress.orderCount})
              </h3>
              <span className="font-mono text-[10px] text-[#5A5D57] uppercase">
                10 pts per $1 spent
              </span>
            </div>

            {progress.orderContributions.length === 0 ? (
              <p className="mt-3 text-xs text-[#5A5D57]">
                No completed or active orders yet. Every purchase automatically counts toward your Bronze, Silver, Gold, and Pro Member milestones.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#0E1113]/10 border-t border-[#0E1113]/10">
                {progress.orderContributions.map((entry) => (
                  <div
                    key={entry.orderId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate({
                            page: 'account',
                            section: 'orders',
                            orderId: entry.orderId,
                          })
                        }
                        className="font-mono text-xs font-bold text-[#0E1113] hover:text-[#C8232C] hover:underline"
                      >
                        #{entry.orderId}
                      </button>
                      <span className="font-mono text-[11px] text-[#5A5D57]">
                        {formatOrderDate(entry.createdAt)}
                      </span>
                      <span className="font-mono text-[10px] text-[#5A5D57]">
                        · {entry.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span className="text-[#5A5D57]">
                        +{entry.pointsEarned.toLocaleString('en-US')} pts
                      </span>
                      <span className="font-bold text-[#0E1113]">
                        {formatUsd(entry.totalUsd)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

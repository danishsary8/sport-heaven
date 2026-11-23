import {
  Check,
  Clock,
  Flame,
  MapPin,
  Phone,
  Store,
  Truck,
} from 'lucide-react';
import type { BranchId } from '../../types/store';
import type {
  BranchAvailabilityStatus,
  BranchPickupEstimate,
} from '../../utils/storePickup';

interface StorePickupSelectorProps {
  estimates: readonly BranchPickupEstimate[];
  selectedBranch: BranchId;
  onSelectBranch: (branchId: BranchId) => void;
}

function getAvailabilityBadgeStyle(status: BranchAvailabilityStatus): string {
  switch (status) {
    case 'ready-fast':
      return 'border-emerald-800/30 bg-emerald-900/10 text-emerald-900';
    case 'limited-stock':
      return 'border-[#B8933B]/45 bg-[#B8933B]/15 text-[#7A5B14]';
    case 'branch-transfer':
    default:
      return 'border-[#032EA1]/35 bg-[#032EA1]/10 text-[#032EA1]';
  }
}

export function StorePickupSelector({
  estimates,
  selectedBranch,
  onSelectBranch,
}: StorePickupSelectorProps) {
  const activeEstimate =
    estimates.find((item) => item.branchId === selectedBranch) ?? estimates[0];

  if (!activeEstimate) return null;

  return (
    <div
      data-testid="store-pickup-selector"
      className="space-y-4 border-t border-[#0E1113]/15 pt-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
            STORE PICKUP · PHNOM PENH BRANCHES
          </p>
          <h3 className="mt-0.5 font-display text-xl font-extrabold tracking-tight text-[#0E1113] uppercase">
            Choose Your Pickup Location
          </h3>
        </div>
        <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#5A5D57] uppercase">
          FREE · 3 PHYSICAL BRANCHES
        </span>
      </div>

      {/* 3 Physical Branch Radio Cards */}
      <div
        role="radiogroup"
        aria-label="Store pickup branch selection"
        className="space-y-2.5"
      >
        {estimates.map((est) => {
          const isSelected = est.branchId === selectedBranch;
          const badgeStyle = getAvailabilityBadgeStyle(est.availabilityStatus);

          return (
            <label
              key={est.branchId}
              data-testid={`pickup-branch-option-${est.branchId}`}
              className={`block cursor-pointer border p-4 transition-colors ${
                isSelected
                  ? 'border-[#0E1113] bg-[#F4F2EC]/80'
                  : 'border-[#0E1113]/15 bg-[#FDFCF9] hover:border-[#0E1113]/45'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <input
                  type="radio"
                  name="storePickupBranch"
                  value={est.branchId}
                  checked={isSelected}
                  onChange={() => onSelectBranch(est.branchId)}
                  className="sr-only"
                />

                {/* Architectural Radio Indicator */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                    isSelected
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/30 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </span>

                <div className="min-w-0 flex-1">
                  {/* Top Row: Branch Name + Fastest / Stock Status + Ready Time */}
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-extrabold tracking-tight text-[#0E1113] uppercase">
                          {est.branch.name}
                        </span>
                        {est.isRecommendedFastest && (
                          <span className="border border-[#B8933B]/45 bg-[#B8933B]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-[#7A5B14] uppercase">
                            Fastest Pickup
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5A5D57]">
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0 text-[#0E1113]/50"
                          aria-hidden="true"
                        />
                        <span>
                          {est.branch.address}, {est.branch.district}
                        </span>
                      </p>
                    </div>

                    {/* Location-Specific Estimated Availability Time */}
                    <div className="shrink-0 sm:text-right">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#032EA1] tabular-nums">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{est.readyWindowLabel}</span>
                      </div>
                      <p className="font-mono text-[10px] font-semibold tracking-[0.06em] text-[#5A5D57] uppercase tabular-nums">
                        Est. Prep {est.durationLabel}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Strip: Stock Status, Hours & Specialty */}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#0E1113]/10 pt-2.5 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.08em] uppercase ${badgeStyle}`}
                    >
                      {est.availabilityStatus === 'branch-transfer' ? (
                        <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <Store className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                      <span>{est.stockSummaryLabel}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#5A5D57]">
                      {est.branch.hours}
                    </span>
                    <span className="font-mono text-[10px] text-[#5A5D57]">
                      {est.branch.phone}
                    </span>
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Selected Branch Estimated Availability Callout */}
      <div
        data-testid="selected-pickup-availability"
        aria-live="polite"
        className="border border-[#0E1113] bg-[#FDFCF9] p-4"
      >
        <div className="flex flex-col justify-between gap-2 border-b border-[#0E1113]/10 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-[#032EA1]" aria-hidden="true" />
            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113] uppercase">
              Estimated Availability · {activeEstimate.branch.name}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#032EA1] tabular-nums">
            {activeEstimate.readyHeadline}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#5A5D57] sm:grid-cols-2">
          <p className="leading-relaxed">
            <strong className="font-semibold text-[#0E1113]">Pickup Prep: </strong>
            {activeEstimate.availabilityNote}
          </p>
          <div className="space-y-1 sm:text-right font-mono text-[11px]">
            <p className="text-[#0E1113]">{activeEstimate.branch.landmarks}</p>
            <p className="inline-flex items-center gap-1.5 text-[#5A5D57] sm:justify-end">
              <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>
                {activeEstimate.branch.phone} · {activeEstimate.branch.telegram}
              </span>
            </p>
            {activeEstimate.hasCustomPrint && (
              <p className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7A5B14] uppercase sm:justify-end">
                <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>Includes Custom Heat-Press Queue</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

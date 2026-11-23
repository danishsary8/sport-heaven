import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Flame,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import type { Order } from '../../types/store';
import {
  buildOrderTransitTimeline,
  type OrderStatus,
  type OrderTransitStep,
} from '../../utils/orderHistory';

interface OrderTransitTimelineProps {
  order: Order;
  variant?: 'compact' | 'detailed';
  className?: string;
}

interface StatusVisualTheme {
  accentRail: string;
  activeNode: string;
  completedNode: string;
  activeLabel: string;
  liveTag: string;
  pulseDot: string;
  stubRail: string;
}

function getStatusVisualTheme(status: OrderStatus): StatusVisualTheme {
  switch (status) {
    case 'Heat-Press Printing':
      return {
        accentRail: 'bg-[#B8933B]',
        activeNode:
          'border-[#B8933B] bg-[#B8933B] text-[#FDFCF9] ring-2 ring-[#B8933B]/30 ring-offset-2 ring-offset-[#F4F2EC]',
        completedNode: 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]',
        activeLabel: 'text-[#7A5B14]',
        liveTag: 'border-[#B8933B]/45 bg-[#B8933B]/15 text-[#7A5B14]',
        pulseDot: 'bg-[#B8933B]',
        stubRail: 'bg-[#B8933B]/45',
      };
    case 'Rider Dispatched':
      return {
        accentRail: 'bg-[#032EA1]',
        activeNode:
          'border-[#032EA1] bg-[#032EA1] text-[#FDFCF9] ring-2 ring-[#032EA1]/25 ring-offset-2 ring-offset-[#F4F2EC]',
        completedNode: 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]',
        activeLabel: 'text-[#032EA1]',
        liveTag: 'border-[#032EA1]/35 bg-[#032EA1]/10 text-[#032EA1]',
        pulseDot: 'bg-[#032EA1]',
        stubRail: 'bg-[#032EA1]/45',
      };
    case 'Delivered':
      return {
        accentRail: 'bg-emerald-800',
        activeNode: 'border-emerald-800 bg-emerald-800 text-[#FDFCF9]',
        completedNode: 'border-emerald-800 bg-emerald-800 text-[#FDFCF9]',
        activeLabel: 'text-emerald-900',
        liveTag: 'border-emerald-800/30 bg-emerald-900/10 text-emerald-900',
        pulseDot: 'bg-emerald-800',
        stubRail: 'bg-emerald-800',
      };
    case 'Confirmed':
    default:
      return {
        accentRail: 'bg-[#0E1113]',
        activeNode:
          'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9] ring-2 ring-[#0E1113]/20 ring-offset-2 ring-offset-[#F4F2EC]',
        completedNode: 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]',
        activeLabel: 'text-[#0E1113]',
        liveTag: 'border-[#0E1113]/25 bg-[#EAE7DF] text-[#0E1113]',
        pulseDot: 'bg-[#0E1113]',
        stubRail: 'bg-[#0E1113]/35',
      };
  }
}

function StepNodeIcon({
  step,
  hasCustomPrint,
  fulfillmentType,
}: {
  step: OrderTransitStep;
  hasCustomPrint: boolean;
  fulfillmentType: 'delivery' | 'pickup';
}) {
  if (step.state === 'completed') {
    return <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />;
  }

  switch (step.key) {
    case 'confirmed':
      return <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'prep':
      return hasCustomPrint ? (
        <Flame className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      );
    case 'transit':
      return fulfillmentType === 'pickup' ? (
        <Store className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
      );
    case 'delivered':
    default:
      return <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

export function OrderTransitTimeline({
  order,
  variant = 'detailed',
  className = '',
}: OrderTransitTimelineProps) {
  const [expandedInCompact, setExpandedInCompact] = useState(false);

  const timeline = useMemo(() => buildOrderTransitTimeline(order), [order]);
  const theme = useMemo(
    () => getStatusVisualTheme(timeline.status),
    [timeline.status],
  );

  const showStepDetails = variant === 'detailed' || expandedInCompact;
  const detailsListId = `order-transit-steps-${order.id.toLowerCase()}`;

  return (
    <div
      data-testid={`order-transit-timeline-${order.id}`}
      data-status={timeline.status}
      className={`border-b border-[#0E1113]/10 bg-[#F4F2EC]/70 px-5 py-4 ${className}`}
    >
      {/* Top Status & ETA Strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            {!timeline.isDelivered && (
              <span
                className={`absolute inset-0 animate-ping opacity-60 motion-reduce:animate-none ${theme.pulseDot}`}
              />
            )}
            <span className={`relative h-2 w-2 ${theme.pulseDot}`} />
          </span>
          <p className="text-xs font-medium text-[#0E1113]">{timeline.headline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.1em] uppercase">
          <span className="text-[#5A5D57] tabular-nums">{timeline.etaLabel}</span>
          <span className="font-bold text-[#0E1113] tabular-nums">
            Stage {timeline.stageStep}/{timeline.totalSteps}
          </span>
          {variant === 'compact' && (
            <button
              type="button"
              aria-expanded={expandedInCompact}
              aria-controls={detailsListId}
              onClick={() => setExpandedInCompact((prev) => !prev)}
              className="inline-flex items-center gap-1 border border-[#0E1113]/20 bg-[#FDFCF9] px-2 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-[#0E1113] uppercase transition hover:border-[#0E1113] motion-reduce:transition-none"
            >
              <span>{expandedInCompact ? 'Hide Log' : 'Transit Log'}</span>
              {expandedInCompact ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Horizontal Visual Timeline (md and up) */}
      <ol
        id={detailsListId}
        aria-label={`Order #${order.id} transit timeline`}
        className="mt-4 hidden md:grid md:grid-cols-4 md:gap-0"
      >
        {timeline.steps.map((step, index) => {
          const isLast = index === timeline.steps.length - 1;
          const isCurrent = step.state === 'current';
          const isCompleted = step.state === 'completed';

          const nodeClasses = isCurrent
            ? theme.activeNode
            : isCompleted
              ? theme.completedNode
              : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#5A5D57]';

          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              data-step-key={step.key}
              data-step-state={step.state}
              className="flex min-w-0 flex-col"
            >
              {/* Node + Seamless Horizontal Connector Rail */}
              <div className="flex items-center">
                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border transition-colors motion-reduce:transition-none ${nodeClasses}`}
                >
                  <StepNodeIcon
                    step={step}
                    hasCustomPrint={timeline.hasCustomPrint}
                    fulfillmentType={timeline.fulfillmentType}
                  />
                </div>

                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="relative h-[2px] flex-1 bg-[#0E1113]/12"
                  >
                    {step.connectorAfterFilled ? (
                      <div
                        className={`h-full w-full transition-colors motion-reduce:transition-none ${
                          timeline.isDelivered ? theme.accentRail : 'bg-[#0E1113]'
                        }`}
                      />
                    ) : isCurrent ? (
                      <div
                        className={`h-full w-2/5 transition-colors motion-reduce:transition-none ${theme.stubRail}`}
                      />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Milestone Copy */}
              <div className={`mt-2.5 ${isLast ? '' : 'pr-4'}`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`font-mono text-[10px] font-bold tracking-[0.1em] uppercase ${
                      isCurrent
                        ? theme.activeLabel
                        : isCompleted
                          ? 'text-[#0E1113]'
                          : 'text-[#5A5D57]'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span
                      className={`border px-1.5 py-px font-mono text-[9px] font-bold tracking-[0.12em] uppercase ${theme.liveTag}`}
                    >
                      Current
                    </span>
                  )}
                </div>

                <p
                  className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                    step.state === 'upcoming'
                      ? 'text-[#5A5D57]/80'
                      : 'text-[#5A5D57]'
                  }`}
                >
                  {step.timestampLabel}
                </p>

                {showStepDetails && (
                  <div className="mt-1.5 space-y-0.5">
                    <p
                      className={`font-mono text-[10px] font-semibold tracking-[0.04em] ${
                        step.state === 'upcoming'
                          ? 'text-[#5A5D57]/80'
                          : 'text-[#0E1113]/80'
                      }`}
                    >
                      {step.location}
                    </p>
                    <p
                      className={`text-[11px] leading-snug ${
                        step.state === 'upcoming'
                          ? 'text-[#5A5D57]/80'
                          : 'text-[#5A5D57]'
                      }`}
                    >
                      {step.detail}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile Vertical Connected Visual Timeline (< md) */}
      <ol
        aria-label={`Order #${order.id} mobile transit timeline`}
        className="mt-4 flex flex-col md:hidden"
      >
        {timeline.steps.map((step, index) => {
          const isLast = index === timeline.steps.length - 1;
          const isCurrent = step.state === 'current';
          const isCompleted = step.state === 'completed';

          const nodeClasses = isCurrent
            ? theme.activeNode
            : isCompleted
              ? theme.completedNode
              : 'border-[#0E1113]/20 bg-[#FDFCF9] text-[#5A5D57]';

          return (
            <li
              key={step.key}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex gap-3 ${isLast ? '' : 'pb-3.5'}`}
            >
              {/* Left Vertical Node & Connector Rail */}
              <div className="flex flex-col items-center">
                <div
                  className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center border transition-colors motion-reduce:transition-none ${nodeClasses}`}
                >
                  <StepNodeIcon
                    step={step}
                    hasCustomPrint={timeline.hasCustomPrint}
                    fulfillmentType={timeline.fulfillmentType}
                  />
                </div>
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="my-1.5 w-[2px] flex-1 bg-[#0E1113]/12"
                  >
                    {step.connectorAfterFilled ? (
                      <div
                        className={`h-full w-full ${
                          timeline.isDelivered ? theme.accentRail : 'bg-[#0E1113]'
                        }`}
                      />
                    ) : isCurrent ? (
                      <div className={`h-2/5 w-full ${theme.stubRail}`} />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Right Step Info */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`font-mono text-[10px] font-bold tracking-[0.1em] uppercase ${
                        isCurrent
                          ? theme.activeLabel
                          : isCompleted
                            ? 'text-[#0E1113]'
                            : 'text-[#5A5D57]'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span
                        className={`border px-1.5 py-px font-mono text-[9px] font-bold tracking-[0.12em] uppercase ${theme.liveTag}`}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#5A5D57] tabular-nums">
                    {step.timestampLabel}
                  </span>
                </div>

                {showStepDetails && (
                  <div className="mt-1 space-y-0.5">
                    <p className="font-mono text-[10px] font-semibold text-[#0E1113]/80">
                      {step.location}
                    </p>
                    <p className="text-[11px] leading-snug text-[#5A5D57]">
                      {step.detail}
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

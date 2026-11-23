import { Calendar, MapPin, Receipt, ShieldCheck } from 'lucide-react';
import type { Order } from '../../types/store';
import { formatKhr, formatUsd } from '../../utils/commerce';
import type { OrderBriefSummary } from '../../utils/orderTracking';

interface OrderBriefSummaryCardProps {
  summary: OrderBriefSummary;
  status: Order['status'];
}

/**
 * Reassuring at-a-glance order verification summary displayed immediately when
 * an order is located on TrackOrderPage (Order Date, Total Amount, Delivery Address).
 */
export function OrderBriefSummaryCard({
  summary,
  status,
}: OrderBriefSummaryCardProps) {
  const itemUnit = summary.itemCount === 1 ? '1 item' : `${summary.itemCount} items`;

  return (
    <section
      aria-label={`Order summary for ${summary.orderId}`}
      data-testid="track-order-summary-card"
      className="border border-[#0E1113]/15 bg-[#FDFCF9]"
    >
      {/* Top Verification Bar */}
      <div className="flex flex-col gap-2 border-b border-[#0E1113]/10 bg-[#EAE7DF]/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-2.5 sm:items-center">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-[#032EA1] sm:mt-0"
            strokeWidth={1.9}
          />
          <div className="min-w-0">
            <p className="text-xs sm:text-[13px] font-semibold text-[#0E1113]">
              Order #{summary.orderId} Confirmed
              <span aria-hidden="true" className="mx-2 text-[#0E1113]/30">
                ·
              </span>
              <span className="font-normal text-[#5A5D57]">
                {summary.reassuranceNote}
              </span>
            </p>
          </div>
        </div>

        <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5A5D57] whitespace-nowrap">
          <span className="font-semibold text-[#032EA1]">{status}</span>
          <span aria-hidden="true" className="mx-1.5 text-[#0E1113]/30">
            ·
          </span>
          <span>{itemUnit}</span>
        </p>
      </div>

      {/* 3-Column Brief Summary Strip */}
      <dl className="grid grid-cols-1 divide-y divide-[#0E1113]/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        {/* 1. Order Date */}
        <div className="p-5 sm:px-7 sm:py-5">
          <dt className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
            <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-[#0E1113]/70" />
            <span>Order Date</span>
          </dt>
          <dd className="mt-2">
            <p className="text-base sm:text-[17px] font-semibold text-[#0E1113] leading-snug">
              {summary.orderDateLabel}
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[#5A5D57]">
              Placed at {summary.orderTimeLabel}
            </p>
          </dd>
        </div>

        {/* 2. Total Amount */}
        <div className="p-5 sm:px-7 sm:py-5">
          <dt className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
            <Receipt aria-hidden="true" className="h-3.5 w-3.5 text-[#0E1113]/70" />
            <span>Total Amount</span>
          </dt>
          <dd className="mt-2">
            <p className="font-mono text-base sm:text-[17px] font-semibold tabular-nums text-[#0E1113] leading-snug">
              {formatUsd(summary.totalUsd)}
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[#5A5D57]">
              {formatKhr(summary.totalUsd)}
              <span aria-hidden="true" className="mx-1.5 text-[#0E1113]/30">
                ·
              </span>
              {summary.paymentLabel}
            </p>
          </dd>
        </div>

        {/* 3. Delivery / Pickup Address */}
        <div className="p-5 sm:px-7 sm:py-5">
          <dt className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-[#0E1113]/70" />
            <span>{summary.addressHeading}</span>
          </dt>
          <dd className="mt-2">
            <p className="text-sm sm:text-[15px] font-semibold text-[#0E1113] leading-snug">
              {summary.addressPrimary}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#5A5D57]">
              {summary.addressSecondary}
              <span aria-hidden="true" className="mx-1.5 text-[#0E1113]/30">
                ·
              </span>
              <span className="text-[#0E1113]/80">{summary.recipientName}</span>
            </p>
          </dd>
        </div>
      </dl>
    </section>
  );
}

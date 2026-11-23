import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Package,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order, RmaRequest } from '../types/store';
import { calculateRmaRefund, formatKhr, formatUsd } from '../utils/commerce';

const RETURN_REASONS = [
  'Boot size runs too snug — need 0.5 / 1 EU size up',
  'Boot size runs too loose — need smaller size',
  'Ordered wrong soleplate for my pitch (FG vs AG/TF)',
  'Jersey fit preference — exchange size',
  'Changed mind (unworn, tags intact)',
  'Manufacturing / print defect inspection',
];

export function ReturnsPortalPage() {
  const { orders, rmaRequests, submitRmaRequest, navigate } = useStore();
  const [orderLookup, setOrderLookup] = useState(orders[0]?.id ?? 'SC-8810');
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(orders[0] ?? null);
  const [lookupError, setLookupError] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>(
    orders[0]?.items.map((i) => i.lineId) ?? [],
  );
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [resolution, setResolution] = useState<'size-exchange' | 'store-credit' | 'refund'>(
    'size-exchange',
  );
  const [createdRma, setCreatedRma] = useState<RmaRequest | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setCreatedRma(null);
    const cleaned = orderLookup.trim().toUpperCase();
    const found = orders.find((o) => o.id.toUpperCase() === cleaned);
    if (!found) {
      setMatchedOrder(null);
      setSelectedLines([]);
      setLookupError(
        `Order "${orderLookup}" was not found. Try ${orders.map((o) => o.id).join(', ')}.`,
      );
      return;
    }
    setMatchedOrder(found);
    setSelectedLines(found.items.map((i) => i.lineId));
  };

  const toggleLine = (lineId: string) => {
    setSelectedLines((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  };

  const refundPreview = useMemo(() => {
    if (!matchedOrder) return { subtotal: 0, bonusCredit: 0, totalRefund: 0 };
    const chosen = matchedOrder.items.filter((i) => selectedLines.includes(i.lineId));
    return calculateRmaRefund(chosen, resolution);
  }, [matchedOrder, selectedLines, resolution]);

  const handleSubmitRma = () => {
    if (!matchedOrder || selectedLines.length === 0) return;
    const chosen = matchedOrder.items.filter((i) => selectedLines.includes(i.lineId));
    const rma = submitRmaRequest({
      orderId: matchedOrder.id,
      items: chosen.map((item) => ({
        lineId: item.lineId,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        refundAmount: Number((item.unitPrice * item.quantity).toFixed(2)),
      })),
      reason,
      resolution,
      totalRefund: refundPreview.totalRefund,
    });
    setCreatedRma(rma);
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      {/* Editorial Header */}
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
            POST-PURCHASE SELF-SERVICE · 30-DAY FIT GUARANTEE
          </p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-display text-5xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-6xl">
                Returns &amp;{' '}
                <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                  Exchanges Portal
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#FDFCF9]/70">
                Initiate an instant size exchange, +5% bonus Store Credit, or ABA KHQR / Card refund. Generate a prepaid Phnom Penh drop-off or rider pickup label in 60 seconds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'policy', slug: 'refund-policy' })}
              className="self-start border border-[#FDFCF9]/25 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:border-[#B8933B] hover:text-[#B8933B]"
            >
              Read Full 30-Day Policy
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Workflow */}
          <div className="space-y-6 lg:col-span-8">
            {/* Step 1: Order Lookup */}
            <form
              onSubmit={handleLookup}
              className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0E1113] uppercase">
                  STEP 01 · LOCATE ORDER
                </p>
                <span className="font-mono text-[10px] text-[#0E1113]/55">
                  Try: {orders.slice(0, 2).map((o) => o.id).join(' / ')}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#0E1113]/45" />
                  <input
                    type="text"
                    value={orderLookup}
                    onChange={(e) => setOrderLookup(e.target.value)}
                    placeholder="Order ID (e.g. SC-8810)"
                    className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] py-3 pr-4 pl-10 font-mono text-sm text-[#0E1113] uppercase outline-none focus:border-[#0E1113]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#0E1113] px-6 py-3 font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C]"
                >
                  Find Order
                </button>
              </div>
              {lookupError && (
                <p className="mt-3 text-xs font-medium text-[#C8232C]">{lookupError}</p>
              )}
            </form>

            {/* Created RMA Confirmation & Printable Label */}
            {createdRma ? (
              <div className="border-2 border-[#0E1113] bg-[#FDFCF9] p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0E1113]/15 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.18em] text-emerald-700 uppercase">
                      <CheckCircle2 className="h-4 w-4" />
                      RMA AUTHORIZED · PREPAID LABEL READY
                    </div>
                    <h2 className="mt-2 font-display text-3xl font-extrabold text-[#0E1113] uppercase">
                      {createdRma.rmaId}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-[#0E1113]/65">
                      Order #{createdRma.orderId} · Created {createdRma.createdAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Prepaid Label
                  </button>
                </div>

                {/* Printable Return Label Mockup */}
                <div className="mt-6 border border-dashed border-[#0E1113]/40 bg-[#F4F2EC] p-5 font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0E1113]/20 pb-3">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] text-[#0E1113]/60 uppercase">
                        SPORT CASTLE PREPAID RETURN COURIER
                      </p>
                      <p className="text-lg font-bold text-[#0E1113]">
                        {createdRma.labelCode}
                      </p>
                    </div>
                    <div className="text-right text-[11px]">
                      <p className="font-bold">SHIP TO: SONTHORMUK HUB</p>
                      <p className="text-[#0E1113]/70">St. 128 Kampuchea Krom, Phnom Penh</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <span className="text-[#0E1113]/55">RESOLUTION:</span>{' '}
                      <strong className="uppercase">{createdRma.resolution}</strong>
                    </div>
                    <div>
                      <span className="text-[#0E1113]/55">CREDIT / REFUND:</span>{' '}
                      <strong>{formatUsd(createdRma.totalRefund)}</strong>
                    </div>
                    <div>
                      <span className="text-[#0E1113]/55">STATUS:</span>{' '}
                      <strong className="text-emerald-700">{createdRma.status}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setCreatedRma(null)}
                    className="border border-[#0E1113]/20 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-[#0E1113] uppercase hover:border-[#0E1113]"
                  >
                    Submit Another Return
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'shop', collectionSlug: 'all' })}
                    className="inline-flex items-center gap-2 bg-[#C8232C] px-5 py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] text-[#FDFCF9] uppercase hover:bg-[#0E1113]"
                  >
                    Shop Replacement Gear <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : matchedOrder ? (
              <div className="space-y-6 border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1113]/15 pb-4">
                  <div>
                    <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0E1113] uppercase">
                      STEP 02 · SELECT ITEMS FROM #{matchedOrder.id}
                    </p>
                    <p className="mt-1 text-xs text-[#0E1113]/65">
                      Ordered {matchedOrder.createdAt} · Status: {matchedOrder.status}
                    </p>
                  </div>
                  <span className="border border-emerald-700/30 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-800 uppercase">
                    30-Day Window Eligible
                  </span>
                </div>

                {/* Items Checklist */}
                <div className="space-y-3">
                  {matchedOrder.items.map((item) => {
                    const checked = selectedLines.includes(item.lineId);
                    return (
                      <label
                        key={item.lineId}
                        className={`flex cursor-pointer items-center gap-4 border p-4 transition ${
                          checked
                            ? 'border-[#0E1113] bg-[#F4F2EC]'
                            : 'border-[#0E1113]/15 bg-[#FDFCF9] opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLine(item.lineId)}
                          className="h-4 w-4 accent-[#0E1113]"
                        />
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 border border-[#0E1113]/10 bg-[#EAE7DF] object-contain p-1"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-lg font-bold text-[#0E1113] uppercase">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] text-[#0E1113]/60">
                            Size {item.size} · Qty {item.quantity}
                            {item.customPrint?.enabled ? ' · Custom Print' : ''}
                          </p>
                        </div>
                        <div className="text-right font-mono text-sm font-bold text-[#0E1113]">
                          {formatUsd(item.unitPrice * item.quantity)}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Step 3: Reason & Resolution */}
                <div className="grid grid-cols-1 gap-5 border-t border-[#0E1113]/15 pt-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-bold tracking-[0.18em] text-[#0E1113]/65 uppercase">
                      STEP 03 · RETURN REASON
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
                    >
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-bold tracking-[0.18em] text-[#0E1113]/65 uppercase">
                      PREFERRED RESOLUTION
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'size-exchange', label: 'Size Exchange', note: 'Same-day ship' },
                        { id: 'store-credit', label: 'Store Credit', note: '+5% Bonus' },
                        { id: 'refund', label: 'Original Pay', note: '24h KHQR' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setResolution(opt.id as 'size-exchange' | 'store-credit' | 'refund')
                          }
                          className={`border p-2.5 text-left transition ${
                            resolution === opt.id
                              ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                              : 'border-[#0E1113]/15 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                          }`}
                        >
                          <p className="font-mono text-[10px] font-bold uppercase">{opt.label}</p>
                          <p
                            className={`mt-0.5 text-[10px] ${
                              resolution === opt.id ? 'text-[#B8933B]' : 'text-[#0E1113]/55'
                            }`}
                          >
                            {opt.note}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary & Generate */}
                <div className="flex flex-col items-start justify-between gap-4 border-t border-[#0E1113]/15 pt-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.18em] text-[#0E1113]/55 uppercase">
                      ESTIMATED {resolution === 'store-credit' ? 'STORE CREDIT (+5% BONUS)' : 'REFUND / EXCHANGE VALUE'}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#0E1113]">
                      {formatUsd(refundPreview.totalRefund)}{' '}
                      <span className="text-xs font-normal text-[#0E1113]/55">
                        ({formatKhr(refundPreview.totalRefund)})
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={selectedLines.length === 0}
                    onClick={handleSubmitRma}
                    className="inline-flex items-center gap-2 bg-[#0E1113] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] disabled:opacity-40"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Generate Prepaid Return Label
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Sidebar: Guarantees & Past RMAs */}
          <div className="space-y-6 lg:col-span-4">
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.18em] text-[#0E1113] uppercase">
                <ShieldCheck className="h-4 w-4 text-[#C8232C]" />
                PHNOM PENH DROP-OFF OR RIDER
              </div>
              <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[#0E1113]/75">
                <li>
                  • <strong>Instant In-Store Swap:</strong> Bring unworn boots to Sonthormuk, Sen Sok, or Chomkadong for an immediate size try-on.
                </li>
                <li>
                  • <strong>24-Hour KHQR Refunds:</strong> Approved refunds return directly to your ABA or Wing account within 1 business day.
                </li>
                <li>
                  • <strong>+5% Credit Bonus:</strong> Choose Sport Castle Store Credit to receive an instant 5% bonus toward your next drop.
                </li>
              </ul>
            </div>

            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.18em] text-[#0E1113] uppercase">
                <Package className="h-4 w-4 text-[#B8933B]" />
                YOUR ACTIVE RMAs ({rmaRequests.length})
              </div>
              {rmaRequests.length === 0 ? (
                <p className="mt-3 text-xs text-[#0E1113]/60">
                  No return authorizations submitted yet. Use Step 01 to look up an order.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {rmaRequests.map((r) => (
                    <div
                      key={r.rmaId}
                      className="border border-[#0E1113]/15 bg-[#F4F2EC] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span>{r.rmaId}</span>
                        <span className="text-emerald-700">{r.status}</span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#0E1113]/65">
                        Order #{r.orderId} · {formatUsd(r.totalRefund)} · {r.resolution}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { trackOrderApi } from '../lib/apiClient';
import { assignMorphSource } from '../hooks/useViewTransition';
import { formatKhr, formatTelegramOrderMessage, formatUsd, getPatchLabel } from '../utils/commerce';
import {
  buildOrderBriefSummary,
  getBuiltInTrackableOrders,
  resolveOrderTracking,
  validateTrackingLookup,
  type TrackedOrderResult,
  type TrackingLookupValidation,
} from '../utils/orderTracking';
import { ProductMedia } from '../components/product';
import { OrderBriefSummaryCard } from '../components/orders/OrderBriefSummaryCard';
import { OrderTrackingQrCard } from '../components/orders/OrderTrackingQrCard';

interface TrackOrderPageProps {
  initialOrderId?: string;
  initialEmail?: string;
}

export function TrackOrderPage({
  initialOrderId,
  initialEmail,
}: TrackOrderPageProps) {
  const {
    orders,
    catalog,
    memberProfile,
    addToCart,
    setCartOpen,
    navigate,
    navigateToShop,
    pushToast,
  } = useStore();

  const [orderIdInput, setOrderIdInput] = useState(initialOrderId ?? '');
  const [emailInput, setEmailInput] = useState(initialEmail ?? '');
  const [fieldErrors, setFieldErrors] = useState<TrackingLookupValidation>({});
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedOrderResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Quick-access list: user's placed orders + built-in sample orders
  const sampleQuickOrders = useMemo(() => {
    const builtIn = getBuiltInTrackableOrders();
    const seen = new Set<string>();
    const combined = [...orders, ...builtIn].filter((o) => {
      const key = o.id.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return combined.slice(0, 4);
  }, [orders]);

  const briefSummary = useMemo(
    () => (tracked ? buildOrderBriefSummary(tracked.order) : null),
    [tracked],
  );

  const executeLookup = async (targetOrderId: string, targetEmail: string) => {
    const validation = validateTrackingLookup(targetOrderId, targetEmail);
    setFieldErrors(validation);
    setLookupError(null);

    if (validation.orderId || validation.email) {
      setTracked(null);
      return;
    }

    setIsSearching(true);
    const localMatch = resolveOrderTracking(
      targetOrderId,
      targetEmail,
      orders,
      memberProfile.email,
    );

    if (!localMatch.error && localMatch.result) {
      window.setTimeout(() => {
        setIsSearching(false);
        setLookupError(null);
        setTracked(localMatch.result);
      }, 120);
      return;
    }

    // Fall back to live PostgreSQL lookup for orders placed across devices/sessions
    const dbOrder = await trackOrderApi(targetOrderId, targetEmail);
    setIsSearching(false);
    if (dbOrder) {
      const dbResolved = resolveOrderTracking(
        targetOrderId,
        targetEmail,
        [dbOrder],
        memberProfile.email,
      );
      if (dbResolved.result) {
        setLookupError(null);
        setTracked(dbResolved.result);
        return;
      }
    }

    setTracked(null);
    setLookupError(localMatch.error ?? 'Unable to locate shipment.');
  };

  // Auto-resolve when arriving via deep link (e.g. from Order Confirmation or Account)
  useEffect(() => {
    if (initialOrderId) {
      const matched = [...orders, ...getBuiltInTrackableOrders()].find(
        (o) => o.id.toUpperCase() === initialOrderId.toUpperCase(),
      );
      const resolvedEmail =
        initialEmail ||
        matched?.customer.email ||
        memberProfile.email;
      setOrderIdInput(initialOrderId);
      setEmailInput(resolvedEmail);
      executeLookup(initialOrderId, resolvedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId, initialEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLookup(orderIdInput, emailInput);
  };

  const handleQuickFill = (sampleId: string, sampleEmail: string) => {
    setOrderIdInput(sampleId);
    setEmailInput(sampleEmail);
    executeLookup(sampleId, sampleEmail);
  };

  const handleReorder = (result: TrackedOrderResult) => {
    let addedCount = 0;
    result.order.items.forEach((item) => {
      const product = catalog.find((p) => p.id === item.productId);
      if (product) {
        addToCart(product, item.size, item.quantity, item.customPrint, false);
        addedCount += 1;
      }
    });
    if (addedCount > 0) {
      pushToast(`Added ${addedCount} item(s) from #${result.order.id} to your bag`);
      setCartOpen(true);
    }
  };

  const handleInspectItem = (slug: string, lineId: string) => {
    assignMorphSource(itemRefs.current[lineId] ?? null);
    navigate({ page: 'product', slug }, slug);
  };

  return (
    <div className="bg-[#F4F2EC] min-h-[75vh] py-8 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
        {/* Editorial Page Header */}
        <header className="border-b border-[#0E1113]/12 pb-6 sm:pb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#032EA1]">
                Sport Castle Dispatch · Phnom Penh Express &amp; Atelier Lab
              </p>
              <h1 className="mt-2 font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-[-0.01em] text-[#0E1113] leading-[0.95] text-balance">
                Track Your Matchday Order
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-[#5A5D57]">
                Enter your Order ID and checkout email to follow real-time heat-press calibration,
                Phnom Penh motorbike courier milestones, or branch pickup readiness.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'branches' })}
                className="inline-flex h-11 items-center gap-2 border border-[#0E1113]/20 bg-[#FDFCF9] px-4 text-xs font-semibold text-[#0E1113] transition-colors hover:border-[#0E1113] cursor-pointer whitespace-nowrap shrink-0"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>3 Phnom Penh Branches</span>
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'returns' })}
                className="inline-flex h-11 items-center gap-2 border border-[#0E1113]/20 bg-[#FDFCF9] px-4 text-xs font-semibold text-[#0E1113] transition-colors hover:border-[#0E1113] cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Returns &amp; Exchanges</span>
              </button>
            </div>
          </div>
        </header>

        {/* Order Lookup Form Panel */}
        <section
          aria-label="Order tracking lookup"
          className="mt-7 sm:mt-8 border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-7 lg:p-8"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start">
              {/* Order ID Input */}
              <div className="md:col-span-4">
                <label
                  htmlFor="track-order-id"
                  className="block font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0E1113]"
                >
                  Order ID *
                </label>
                <div className="relative mt-2">
                  <Package
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A5D57]"
                  />
                  <input
                    id="track-order-id"
                    name="orderId"
                    type="text"
                    autoComplete="off"
                    value={orderIdInput}
                    onChange={(e) => {
                      setOrderIdInput(e.target.value);
                      if (fieldErrors.orderId) {
                        setFieldErrors((prev) => ({ ...prev, orderId: undefined }));
                      }
                    }}
                    placeholder="e.g. SC-8810 or SC-9024"
                    aria-invalid={Boolean(fieldErrors.orderId)}
                    aria-describedby={fieldErrors.orderId ? 'track-order-id-error' : undefined}
                    className={`h-12 w-full border bg-[#F4F2EC]/60 pl-10 pr-3.5 font-mono text-sm text-[#0E1113] placeholder:text-[#5A5D57]/70 transition-colors focus:bg-white focus:outline-none ${
                      fieldErrors.orderId
                        ? 'border-[#C8232C] focus:border-[#C8232C]'
                        : 'border-[#0E1113]/20 focus:border-[#0E1113]'
                    }`}
                  />
                </div>
                {fieldErrors.orderId && (
                  <p
                    id="track-order-id-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[#C8232C]"
                  >
                    {fieldErrors.orderId}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="md:col-span-5">
                <label
                  htmlFor="track-order-email"
                  className="block font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0E1113]"
                >
                  Checkout Email Address *
                </label>
                <div className="relative mt-2">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A5D57]"
                  />
                  <input
                    id="track-order-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="e.g. sokha.chan@phnompenhfc.kh"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'track-order-email-error' : undefined}
                    className={`h-12 w-full border bg-[#F4F2EC]/60 pl-10 pr-3.5 text-sm text-[#0E1113] placeholder:text-[#5A5D57]/70 transition-colors focus:bg-white focus:outline-none ${
                      fieldErrors.email
                        ? 'border-[#C8232C] focus:border-[#C8232C]'
                        : 'border-[#0E1113]/20 focus:border-[#0E1113]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id="track-order-email-error"
                    role="alert"
                    className="mt-1.5 text-xs font-medium text-[#C8232C]"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Primary Submit CTA */}
              <div className="md:col-span-3 md:pt-[26px]">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#0E1113] px-5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#FDFCF9] transition-colors hover:bg-[#C8232C] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>{isSearching ? 'Locating...' : 'Track Shipment'}</span>
                </button>
              </div>
            </div>

            {/* Lookup Error State */}
            {lookupError && (
              <div
                role="alert"
                className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#C8232C]/35 bg-[#C8232C]/6 px-4 py-3 text-xs text-[#0E1113]"
              >
                <p className="font-medium text-[#C8232C]">{lookupError}</p>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'contact' })}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0E1113] underline underline-offset-4 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  Ask Concierge
                </button>
              </div>
            )}
          </form>

          {/* Interactive Sample / Recent Orders Quick Selector */}
          <div className="mt-5 border-t border-[#0E1113]/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#5A5D57] mr-1">
                Recent &amp; Sample Orders:
              </span>
              {sampleQuickOrders.map((sample) => {
                const sampleEmail = sample.customer.email || memberProfile.email;
                const isSelected =
                  tracked?.order.id.toUpperCase() === sample.id.toUpperCase();
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleQuickFill(sample.id, sampleEmail)}
                    className={`inline-flex h-9 items-center gap-2 border px-3 font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                        : 'border-[#0E1113]/18 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                    }`}
                  >
                    <span className="font-semibold">#{sample.id}</span>
                    <span aria-hidden="true" className="opacity-45">
                      ·
                    </span>
                    <span className="opacity-85">{sample.status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Active Shipment Timeline & Order Breakdown */}
        <AnimatePresence mode="wait">
          {tracked && briefSummary ? (
            <motion.div
              key={tracked.order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 space-y-6"
            >
              {/* Reassuring Brief Order Summary Card */}
              <OrderBriefSummaryCard
                summary={briefSummary}
                status={tracked.order.status}
              />

              <section
                aria-label={`Shipping timeline for order ${tracked.order.id}`}
                className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
              >
              {/* LEFT: Shipping Timeline & Progress Stage */}
              <div className="lg:col-span-8 space-y-6">
                {/* Summary Strip */}
                <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-7">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#0E1113]/10 pb-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5D57]">
                        <span className="font-mono font-semibold uppercase tracking-[0.12em] text-[#032EA1]">
                          {tracked.order.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {tracked.trackingNumber}
                        </span>
                      </div>
                      <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-extrabold uppercase text-[#0E1113] leading-none">
                        Order #{tracked.order.id}
                      </h2>
                      <p className="mt-1.5 text-xs sm:text-sm text-[#5A5D57]">
                        {tracked.carrier} · {tracked.order.customer.fullName}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#5A5D57]">
                        Estimated Arrival
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#0E1113]">
                        {tracked.estimatedWindow}
                      </p>
                      <p className="mt-1 font-mono text-xs tabular-nums text-[#5A5D57]">
                        Total Paid: {formatUsd(tracked.order.totalUsd)} ({formatKhr(tracked.order.totalUsd)})
                      </p>
                    </div>
                  </div>

                  {/* Animated Progress Track */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#0E1113]">
                        Current Hub: {tracked.currentHub}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#032EA1]">
                        {tracked.progressPercent}% Complete
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={tracked.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Order shipping progress"
                      className="mt-2.5 h-2 w-full overflow-hidden bg-[#EAE7DF]"
                    >
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: tracked.progressPercent / 100 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: '0% 50%' }}
                        className="h-full w-full bg-[#0E1113]"
                      />
                    </div>
                  </div>

                  {/* Key Dispatch Metadata */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-3.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                        Fulfillment
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#0E1113]">
                        {tracked.order.fulfillmentMethod === 'pickup'
                          ? 'In-Store Branch Pickup'
                          : 'Phnom Penh Express Courier'}
                      </p>
                    </div>
                    <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-3.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                        Courier / Desk
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#0E1113]">
                        {tracked.riderName}
                      </p>
                    </div>
                    <div className="border border-[#0E1113]/10 bg-[#F4F2EC] p-3.5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5A5D57]">
                        Payment Verified
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold uppercase text-[#0E1113]">
                        {tracked.order.paymentMethod.replace('-', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vertical 5-Stage Shipping Timeline */}
                <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0E1113]/10 pb-4">
                    <h3 className="font-display text-2xl font-bold uppercase text-[#0E1113]">
                      Shipping Milestones
                    </h3>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#5A5D57]">
                      Phnom Penh Local Time (ICT)
                    </span>
                  </div>

                  <ol className="mt-6 space-y-0">
                    {tracked.milestones.map((step, index) => {
                      const isLast = index === tracked.milestones.length - 1;
                      const isDone = step.state === 'completed';
                      const isCurrent = step.state === 'current';

                      return (
                        <motion.li
                          key={step.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: index * 0.06,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="relative flex gap-4 pb-6 last:pb-0"
                        >
                          {/* Vertical Connector Rail */}
                          {!isLast && (
                            <span
                              aria-hidden="true"
                              className={`absolute left-[15px] top-8 bottom-0 w-px ${
                                isDone ? 'bg-[#0E1113]' : 'bg-[#0E1113]/15'
                              }`}
                            />
                          )}

                          {/* Milestone Node Icon */}
                          <div
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center border transition-colors ${
                              isDone
                                ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                                : isCurrent
                                  ? 'border-[#032EA1] bg-[#032EA1] text-white'
                                  : 'border-[#0E1113]/20 bg-[#F4F2EC] text-[#5A5D57]'
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-4 w-4" strokeWidth={2.2} />
                            ) : isCurrent ? (
                              <Truck className="h-4 w-4" strokeWidth={2} />
                            ) : (
                              <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                            )}
                          </div>

                          {/* Milestone Content */}
                          <div
                            className={`min-w-0 flex-1 border p-4 transition-colors ${
                              isCurrent
                                ? 'border-[#032EA1]/40 bg-[#032EA1]/[0.04]'
                                : isDone
                                  ? 'border-[#0E1113]/12 bg-[#FFFFFF]'
                                  : 'border-[#0E1113]/8 bg-[#F4F2EC]/55'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                              <span
                                className={`font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] ${
                                  isCurrent
                                    ? 'text-[#032EA1]'
                                    : isDone
                                      ? 'text-[#0E1113]'
                                      : 'text-[#5A5D57]'
                                }`}
                              >
                                {step.stage}
                                {isCurrent ? ' · Active Step' : isDone ? ' · Completed' : ' · Scheduled'}
                              </span>
                              <time className="font-mono text-[11px] tabular-nums text-[#5A5D57]">
                                {step.timestamp}
                              </time>
                            </div>

                            <h4 className="mt-1 text-sm sm:text-[15px] font-semibold text-[#0E1113]">
                              {step.title}
                            </h4>
                            <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#5A5D57]">
                              {step.description}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#0E1113]/80">
                              <MapPin className="h-3 w-3 shrink-0 text-[#B8933B]" />
                              <span>{step.location}</span>
                            </p>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* RIGHT: Mobile QR Pass, Destination & Interactive Parcel Summary */}
              <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
                {/* Mobile Tracking QR Pass */}
                <OrderTrackingQrCard
                  orderId={tracked.order.id}
                  email={tracked.order.customer.email || emailInput}
                  status={tracked.order.status}
                  trackingNumber={tracked.trackingNumber}
                  onNotify={pushToast}
                />

                {/* Destination Card */}
                <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    {tracked.order.fulfillmentMethod === 'pickup' ? (
                      <Building2 className="h-4 w-4 text-[#0E1113]" />
                    ) : (
                      <MapPin className="h-4 w-4 text-[#0E1113]" />
                    )}
                    <h3 className="font-display text-lg font-bold uppercase text-[#0E1113]">
                      {tracked.order.fulfillmentMethod === 'pickup'
                        ? 'Pickup Atelier'
                        : 'Delivery Destination'}
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#5A5D57]">
                    <p className="font-semibold text-[#0E1113]">
                      {tracked.order.customer.fullName}
                    </p>
                    <p>{tracked.order.customer.streetAddress}</p>
                    <p>
                      {tracked.order.customer.sangkat
                        ? `${tracked.order.customer.sangkat}, `
                        : ''}
                      {tracked.order.customer.khan}, Phnom Penh
                    </p>
                    <p className="font-mono text-[#0E1113]">
                      {tracked.order.customer.phone}
                      {tracked.order.customer.telegram
                        ? ` · ${tracked.order.customer.telegram}`
                        : ''}
                    </p>
                    <p className="font-mono text-[11px] tabular-nums text-[#5A5D57]">
                      GPS Pin: {tracked.destinationCoords.lat.toFixed(4)}° N,{' '}
                      {tracked.destinationCoords.lng.toFixed(4)}° E
                    </p>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${tracked.destinationCoords.lat},${tracked.destinationCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 border border-[#0E1113]/20 bg-[#F4F2EC] px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0E1113] transition-colors hover:border-[#0E1113] hover:bg-white"
                  >
                    <span>Open Pin in Google Maps</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Parcel Contents (Interactive Click-to-PDP Morph Cards) */}
                <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold uppercase text-[#0E1113]">
                      Parcel Contents ({tracked.order.items.length})
                    </h3>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#0E1113]">
                      {formatUsd(tracked.order.totalUsd)}
                    </span>
                  </div>

                  <ul className="divide-y divide-[#0E1113]/10">
                    {tracked.order.items.map((item) => (
                      <li key={item.lineId} className="py-3 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => handleInspectItem(item.slug, item.lineId)}
                          className="group flex w-full items-start gap-3 text-left cursor-pointer"
                        >
                          <div
                            ref={(el) => {
                              itemRefs.current[item.lineId] = el;
                            }}
                            className="h-16 w-16 shrink-0 overflow-hidden border border-[#0E1113]/10 bg-[#EAE7DF]"
                          >
                            <ProductMedia
                              product={item}
                              className="h-full w-full bg-[#EAE7DF]"
                              imgClassName="transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-[#0E1113] group-hover:text-[#C8232C] transition-colors">
                              {item.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-[#5A5D57]">
                              Qty {item.quantity} · Size {item.size}
                            </p>
                            {item.customPrint?.enabled && (
                              <p className="mt-0.5 font-mono text-[10.5px] text-[#032EA1]">
                                Print: {item.customPrint.playerName || 'CUSTOM'} #
                                {item.customPrint.squadNumber || '--'} ·{' '}
                                {getPatchLabel(item.customPrint.patch)}
                              </p>
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold tabular-nums text-[#0E1113]">
                            {formatUsd(item.unitPrice * item.quantity)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="space-y-2 border-t border-[#0E1113]/10 pt-4">
                    <button
                      type="button"
                      onClick={() => handleReorder(tracked)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#0E1113] px-4 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] transition-colors hover:bg-[#C8232C] cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Buy Again</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(formatTelegramOrderMessage(tracked.order))
                            .catch(() => {});
                          pushToast(`Copied #${tracked.order.id} receipt for Telegram`);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#0E1113]/20 bg-white px-3 text-xs font-semibold text-[#0E1113] hover:border-[#0E1113] cursor-pointer whitespace-nowrap"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Telegram Copy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'returns' })}
                        className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#0E1113]/20 bg-white px-3 text-xs font-semibold text-[#0E1113] hover:border-[#0E1113] cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Size Swap</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Guarantee Strip */}
                <div className="flex items-start gap-3 border border-[#0E1113]/12 bg-[#EAE7DF]/65 p-4 text-xs text-[#5A5D57]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E1113]" />
                  <p className="leading-relaxed">
                    Every Phnom Penh dispatch includes verified authenticity sealing and 30-day
                    unworn boot size exchange across all 3 Sport Castle branches.
                  </p>
                </div>
              </aside>
              </section>
            </motion.div>
          ) : (
            <motion.section
              key="empty-tracking-guide"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3"
            >
              <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B8933B]">
                  01. Same-Day Dispatch
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase text-[#0E1113]">
                  1–3 Hr Phnom Penh Courier
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5A5D57]">
                  Orders placed before 6:00 PM ICT dispatch the same day across all 12 Phnom Penh
                  Khans with live Telegram rider handoff.
                </p>
              </div>
              <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B8933B]">
                  02. Heat-Press Atelier
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase text-[#0E1113]">
                  15-Min Pro Custom Printing
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5A5D57]">
                  Follow your custom name, squad number, and UCL/CPL/F1 sleeve patch directly from
                  calibration press to sealed matchday parcel.
                </p>
              </div>
              <div className="border border-[#0E1113]/12 bg-[#FDFCF9] p-6 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#B8933B]">
                    03. Still Shopping?
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold uppercase text-[#0E1113]">
                    Explore 2026/27 Drops
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5A5D57]">
                    Browse authentic boots, Champions League kits, and F1 paddock shirts stocked
                    across Sonthormuk, Sen Sok, and Chomkadong.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateToShop({ collectionSlug: 'all' })}
                  className="mt-4 inline-flex h-10 items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer self-start"
                >
                  <span>Browse Full Catalog</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Copy,
  CreditCard,
  MapPin,
  Send,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { PHNOM_PENH_KHANS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import type {
  BranchId,
  CustomerDetails,
  FulfillmentMethod,
  Order,
  PaymentMethod,
} from '../types/store';
import {
  calculateCartTotals,
  formatKhr,
  formatTelegramOrderMessage,
  formatUsd,
  generateOrderId,
  getPatchLabel,
  validateCheckoutDetails,
  type CheckoutValidationErrors,
} from '../utils/commerce';
import { buildAllBranchPickupEstimates } from '../utils/storePickup';
import { ProductMedia } from '../components/product';
import {
  CheckoutLocationPicker,
  type SelectedMapLocation,
} from '../components/maps/CheckoutLocationPicker';
import { StorePickupSelector } from '../components/checkout/StorePickupSelector';

export function CheckoutPage() {
  const {
    cart,
    catalog,
    promoCode,
    giftNote,
    clearCart,
    addOrder,
    addresses,
    memberProfile,
    isAuthenticated,
    navigate,
    navigateToShop,
    pushToast,
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [guestMode, setGuestMode] = useState(!isAuthenticated);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>('delivery');
  const [pickupBranch, setPickupBranch] = useState<BranchId>(
    memberProfile.homeBranch || 'sonthormuk',
  );
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: isAuthenticated ? memberProfile.fullName : '',
    email: isAuthenticated ? memberProfile.email : '',
    phone: isAuthenticated ? memberProfile.phone : '+855 ',
    telegram: isAuthenticated ? memberProfile.telegram : '',
    khan: addresses[0]?.khan ?? 'Khan Toul Kork',
    sangkat: addresses[0]?.sangkat ?? '',
    streetAddress: addresses[0]?.streetAddress ?? '',
    notes: '',
    isGuest: !isAuthenticated,
  });
  const [errors, setErrors] = useState<CheckoutValidationErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('aba-khqr');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [telegramCopied, setTelegramCopied] = useState(false);

  const totals = calculateCartTotals(cart, promoCode, fulfillmentMethod);
  const pickupEstimates = useMemo(
    () => buildAllBranchPickupEstimates(cart, catalog),
    [cart, catalog],
  );
  const selectedPickupEstimate =
    pickupEstimates.find((est) => est.branchId === pickupBranch) ??
    pickupEstimates[0];
  const fastestPickupEstimate =
    pickupEstimates.find((est) => est.isRecommendedFastest) ??
    pickupEstimates[0];

  if (cart.length === 0 && !completedOrder) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-[#56616A]/50" />
        <h1 className="mt-4 font-display text-2xl font-bold text-[#18222D]">
          Your bag is empty
        </h1>
        <p className="mt-2 text-sm text-[#56616A]">
          Add football boots, custom jerseys, F1 kits, or match balls before starting Phnom Penh checkout.
        </p>
        <button
          type="button"
          onClick={() => navigateToShop({ category: 'all' })}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#18222D] px-6 text-sm font-semibold text-white cursor-pointer"
        >
          <span>Shop Catalog</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const handleMapLocationSelect = (loc: SelectedMapLocation) => {
    setCustomer((prev) => ({
      ...prev,
      khan: loc.khan,
      sangkat: loc.sangkat || prev.sangkat,
      streetAddress: loc.streetAddress,
      coordinates: { lat: loc.lat, lng: loc.lng },
    }));
    setErrors((prev) => ({
      ...prev,
      khan: undefined,
      streetAddress: undefined,
    }));
    pushToast(
      loc.source === 'geolocation'
        ? `Current GPS locked · ${loc.khan}`
        : `Delivery pin set · ${loc.khan}`,
    );
  };

  const handleContinueFromStep2 = () => {
    const nextErrors = validateCheckoutDetails(customer, fulfillmentMethod);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep(3);
    }
  };

  const handlePlaceOrder = (expressProvider?: PaymentMethod) => {
    const activePay = expressProvider ?? paymentMethod;
    const finalCustomer: CustomerDetails = expressProvider
      ? {
          fullName: customer.fullName.trim() || memberProfile.fullName,
          email: customer.email?.trim() || memberProfile.email,
          phone: customer.phone.trim().length > 6 ? customer.phone : memberProfile.phone,
          telegram: customer.telegram || memberProfile.telegram,
          khan: customer.khan || 'Khan Toul Kork',
          sangkat: customer.sangkat || 'Sangkat Boeung Kak 1',
          streetAddress:
            customer.streetAddress.trim() || memberProfile.savedAddress,
          coordinates: customer.coordinates,
          notes: customer.notes,
          isGuest: guestMode,
        }
      : { ...customer, isGuest: guestMode };

    const newOrder: Order = {
      id: generateOrderId(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: cart.some((item) => item.customPrint?.enabled)
        ? 'Heat-Press Printing'
        : 'Confirmed',
      fulfillmentMethod,
      pickupBranch: fulfillmentMethod === 'pickup' ? pickupBranch : undefined,
      customer: finalCustomer,
      paymentMethod: activePay,
      items: [...cart],
      subtotal: totals.subtotal,
      teamDiscount: totals.teamDiscount,
      promoDiscount: totals.promoDiscount,
      promoCode: totals.promoValid ? promoCode : undefined,
      giftNote: giftNote || undefined,
      shippingFee: totals.shippingFee,
      totalUsd: totals.totalUsd,
      totalKhr: totals.totalKhr,
    };

    addOrder(newOrder);
    setCompletedOrder(newOrder);
    clearCart();
    pushToast(`Order #${newOrder.id} confirmed!`);
    navigate({ page: 'thank-you', orderId: newOrder.id });
  };

  const handleCopyTelegramReceipt = () => {
    if (!completedOrder) return;
    const summary = formatTelegramOrderMessage(completedOrder);
    navigator.clipboard?.writeText(summary).catch(() => {});
    setTelegramCopied(true);
    pushToast('Order receipt copied for @SportCastleKH Telegram');
  };

  const stepLabels = [
    { num: 1, label: 'Fulfillment' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Payment' },
    { num: 4, label: 'Receipt' },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      {/* Checkout Header & Stepper */}
      <div className="border-b border-[#18222D]/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
          Sport Castle Phnom Penh Checkout
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#18222D]">
          {step === 4 && completedOrder
            ? `Order #${completedOrder.id} Confirmed`
            : 'Complete Your Matchday Order'}
        </h1>

        <ol className="mt-5 flex flex-wrap items-center gap-3 sm:gap-6 text-xs">
          {stepLabels.map((item) => {
            const done = step > item.num;
            const current = step === item.num;
            return (
              <li key={item.num} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                    done
                      ? 'bg-[#032EA1] text-white'
                      : current
                        ? 'bg-[#18222D] text-white'
                        : 'bg-[#E8EDF2] text-[#56616A]'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : item.num}
                </span>
                <span
                  className={
                    current || done
                      ? 'font-semibold text-[#18222D]'
                      : 'text-[#56616A]'
                  }
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* LEFT MAIN STEP FLOW */}
        <div className="lg:col-span-7">
          {/* STEP 1: EXPRESS PAY + FULFILLMENT */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Express Checkout Strip */}
              <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
                    EXPRESS 1-TAP CHECKOUT
                  </p>
                  <button
                    type="button"
                    onClick={() => setGuestMode((g) => !g)}
                    className="font-mono text-[10px] font-bold text-[#0E1113] uppercase underline"
                  >
                    {guestMode ? 'Guest Checkout Active' : `Member: ${memberProfile.fullName}`}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(
                    [
                      { id: 'aba-khqr', label: 'ABA KHQR', style: 'bg-[#005E7C] text-white' },
                      { id: 'apple-pay', label: 'Apple Pay', style: 'bg-[#0E1113] text-white' },
                      { id: 'google-pay', label: 'Google Pay', style: 'border border-[#0E1113] bg-white text-[#0E1113]' },
                      { id: 'paypal', label: 'PayPal', style: 'bg-[#FFC439] text-[#0E1113]' },
                    ] as const
                  ).map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handlePlaceOrder(ex.id)}
                      className={`h-11 font-mono text-xs font-bold uppercase transition hover:opacity-90 cursor-pointer ${ex.style}`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 space-y-5">
                <h2 className="font-display text-xl font-extrabold tracking-tight text-[#0E1113] uppercase">
                  Step 1 · Choose Delivery or Store Pickup
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    aria-pressed={fulfillmentMethod === 'delivery'}
                    onClick={() => setFulfillmentMethod('delivery')}
                    className={`flex flex-col border p-4 text-left transition-colors cursor-pointer ${
                      fulfillmentMethod === 'delivery'
                        ? 'border-[#0E1113] bg-[#F4F2EC]/80'
                        : 'border-[#0E1113]/15 bg-white hover:border-[#0E1113]/45'
                    }`}
                  >
                    <Truck className="h-5 w-5 text-[#0E1113]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-[#0E1113]">
                      Phnom Penh Express Delivery
                    </p>
                    <p className="mt-1 text-xs text-[#5A5D57]">
                      Same-day motorbike courier across all 12 Phnom Penh Khans (1–3 hrs).
                    </p>
                    <p className="mt-3 font-mono text-xs font-bold text-[#032EA1]">
                      {totals.subtotal >= 50 ? 'FREE (Over $50)' : '$2.50 Flat Fee'}
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={fulfillmentMethod === 'pickup'}
                    onClick={() => setFulfillmentMethod('pickup')}
                    className={`flex flex-col border p-4 text-left transition-colors cursor-pointer ${
                      fulfillmentMethod === 'pickup'
                        ? 'border-[#0E1113] bg-[#F4F2EC]/80'
                        : 'border-[#0E1113]/15 bg-white hover:border-[#0E1113]/45'
                    }`}
                  >
                    <Building2 className="h-5 w-5 text-[#0E1113]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-[#0E1113]">
                      Store Pickup
                    </p>
                    <p className="mt-1 text-xs text-[#5A5D57]">
                      Collect and verify fit at Sonthormuk, Sen Sok, or Chomkadong.
                    </p>
                    <p className="mt-3 font-mono text-xs font-bold text-[#032EA1] tabular-nums">
                      FREE · From {fastestPickupEstimate?.durationLabel ?? '~25 mins'}
                    </p>
                  </button>
                </div>

                {fulfillmentMethod === 'pickup' && (
                  <StorePickupSelector
                    estimates={pickupEstimates}
                    selectedBranch={pickupBranch}
                    onSelectBranch={setPickupBranch}
                  />
                )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex h-11 items-center gap-2 bg-[#0E1113] px-6 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
                >
                  <span>Continue to Customer Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {step === 2 && (
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                  {fulfillmentMethod === 'pickup'
                    ? 'Step 2 · Customer & Store Pickup Details'
                    : 'Step 2 · Customer & Phnom Penh Delivery Details'}
                </h2>
                {addresses.length > 0 && fulfillmentMethod === 'delivery' && (
                  <div className="flex flex-wrap gap-1.5">
                    {addresses.slice(0, 2).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setCustomer((prev) => ({
                            ...prev,
                            fullName: a.fullName,
                            phone: a.phone,
                            khan: a.khan,
                            sangkat: a.sangkat,
                            streetAddress: a.streetAddress,
                          }))
                        }
                        className="border border-[#0E1113]/20 bg-[#F4F2EC] px-2.5 py-1 font-mono text-[10px] font-bold text-[#0E1113] uppercase hover:border-[#0E1113] cursor-pointer"
                      >
                        Autofill: {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {fulfillmentMethod === 'pickup' && selectedPickupEstimate && (
                <div
                  data-testid="step2-pickup-recap"
                  className="flex flex-col justify-between gap-3 border border-[#0E1113]/20 bg-[#F4F2EC]/80 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-[#B8933B] uppercase">
                      Store Pickup Location
                    </p>
                    <p className="font-display text-lg font-extrabold text-[#0E1113] uppercase">
                      {selectedPickupEstimate.branch.name}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-[#5A5D57]">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {selectedPickupEstimate.branch.address},{' '}
                        {selectedPickupEstimate.branch.district}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#032EA1] tabular-nums">
                      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{selectedPickupEstimate.readyHeadline}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="shrink-0 self-start border border-[#0E1113] bg-[#FDFCF9] px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#0E1113] uppercase transition hover:bg-[#0E1113] hover:text-[#FDFCF9] sm:self-center cursor-pointer"
                  >
                    Change Branch
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="chk-name"
                    className="block text-xs font-semibold text-[#18222D]"
                  >
                    Full Name *
                  </label>
                  <input
                    id="chk-name"
                    type="text"
                    value={customer.fullName}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    placeholder="e.g. Sokha Meas"
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-[#D81E2B]">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="chk-email"
                    className="block text-xs font-semibold text-[#18222D]"
                  >
                    Email Address (For Live Order Tracking)
                  </label>
                  <input
                    id="chk-email"
                    type="email"
                    value={customer.email ?? ''}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="e.g. sokha@phnompenhfc.kh"
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="chk-phone"
                    className="block text-xs font-semibold text-[#18222D]"
                  >
                    Phone Number (+855) *
                  </label>
                  <input
                    id="chk-phone"
                    type="tel"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+855 12 345 678"
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-[#D81E2B]">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="chk-telegram"
                    className="block text-xs font-semibold text-[#18222D]"
                  >
                    Telegram Username (For Rider Updates)
                  </label>
                  <input
                    id="chk-telegram"
                    type="text"
                    value={customer.telegram}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, telegram: e.target.value }))
                    }
                    placeholder="@username"
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                  {errors.telegram && (
                    <p className="mt-1 text-xs text-[#D81E2B]">{errors.telegram}</p>
                  )}
                </div>

                {fulfillmentMethod === 'delivery' && (
                  <>
                    <div className="sm:col-span-2 pt-1">
                      <CheckoutLocationPicker
                        value={customer.coordinates}
                        onLocationSelect={handleMapLocationSelect}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="chk-khan"
                        className="block text-xs font-semibold text-[#18222D]"
                      >
                        Phnom Penh Khan / District *
                      </label>
                      <select
                        id="chk-khan"
                        value={customer.khan}
                        onChange={(e) =>
                          setCustomer((prev) => ({ ...prev, khan: e.target.value }))
                        }
                        className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D]"
                      >
                        {PHNOM_PENH_KHANS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      {errors.khan && (
                        <p className="mt-1 text-xs text-[#D81E2B]">{errors.khan}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="chk-sangkat"
                        className="block text-xs font-semibold text-[#18222D]"
                      >
                        Sangkat / Commune
                      </label>
                      <input
                        id="chk-sangkat"
                        type="text"
                        value={customer.sangkat}
                        onChange={(e) =>
                          setCustomer((prev) => ({ ...prev, sangkat: e.target.value }))
                        }
                        placeholder="e.g. Boeung Kak 1"
                        className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="chk-address"
                        className="block text-xs font-semibold text-[#18222D]"
                      >
                        Street, House Number or Pitch Landmark *
                      </label>
                      <input
                        id="chk-address"
                        type="text"
                        value={customer.streetAddress}
                        onChange={(e) =>
                          setCustomer((prev) => ({
                            ...prev,
                            streetAddress: e.target.value,
                          }))
                        }
                        placeholder="e.g. House 24, Street 315 (Near TK Avenue)"
                        className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                      />
                      {errors.streetAddress && (
                        <p className="mt-1 text-xs text-[#D81E2B]">
                          {errors.streetAddress}
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="chk-notes"
                    className="block text-xs font-semibold text-[#18222D]"
                  >
                    Order or Printing Notes (Optional)
                  </label>
                  <input
                    id="chk-notes"
                    type="text"
                    value={customer.notes}
                    onChange={(e) =>
                      setCustomer((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="e.g. Need before 6:30 PM match at Sen Sok Turf"
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-sm text-[#18222D]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-11 items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5A5D57] hover:text-[#0E1113] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleContinueFromStep2}
                  className="inline-flex h-11 items-center gap-2 bg-[#0E1113] px-6 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT (ABA KHQR / WING-ACLEDA / COD) */}
          {step === 3 && (
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 space-y-6">
              <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-[#0E1113]">
                Step 3 · Select Cambodian Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'aba-khqr',
                      title: 'ABA KHQR',
                      desc: 'Instant scan-to-pay (USD / KHR)',
                    },
                    {
                      id: 'wing-acleda',
                      title: 'Wing / ACLEDA',
                      desc: 'Local bank transfer confirmation',
                    },
                    {
                      id: 'cod',
                      title: 'Cash on Delivery',
                      desc: 'Pay USD or KHR to rider',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                      paymentMethod === opt.id
                        ? 'border-[#18222D] bg-[#F5F7F8]'
                        : 'border-[#18222D]/15 hover:border-[#18222D]/40'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-[#18222D]" />
                    <p className="mt-2 text-sm font-bold text-[#18222D]">
                      {opt.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#56616A]">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* ABA KHQR Scannable Card Preview */}
              {paymentMethod === 'aba-khqr' && (
                <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-[#18222D]/12 bg-[#F5F7F8] p-5">
                  {/* Crisp Vector KHQR Card */}
                  <div className="w-44 shrink-0 overflow-hidden rounded-xl bg-white shadow-md border border-[#18222D]/10">
                    <div className="bg-[#D81E2B] py-2 text-center font-display text-xs font-extrabold tracking-[0.16em] text-white">
                      KHQR
                    </div>
                    <div className="p-3.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#18222D]">
                        SPORT CASTLE KH
                      </p>
                      <p className="font-mono text-xs font-bold text-[#032EA1]">
                        {formatUsd(totals.totalUsd)}
                      </p>
                      <svg
                        viewBox="0 0 100 100"
                        className="mx-auto mt-2 h-28 w-28"
                        aria-label="Sport Castle ABA KHQR payment matrix preview"
                      >
                        <rect width="100" height="100" fill="#FFFFFF" />
                        {/* Corner Finder Patterns */}
                        <rect x="6" y="6" width="24" height="24" fill="none" stroke="#18222D" strokeWidth="4" />
                        <rect x="13" y="13" width="10" height="10" fill="#18222D" />
                        <rect x="70" y="6" width="24" height="24" fill="none" stroke="#18222D" strokeWidth="4" />
                        <rect x="77" y="13" width="10" height="10" fill="#18222D" />
                        <rect x="6" y="70" width="24" height="24" fill="none" stroke="#18222D" strokeWidth="4" />
                        <rect x="13" y="77" width="10" height="10" fill="#18222D" />
                        {/* Deterministic Data Modules */}
                        <path
                          d="M38 10h6v6h-6zM50 10h6v6h-6zM44 18h6v6h-6zM58 18h6v6h-6zM38 28h12v6H38zM10 40h8v6h-8zM24 40h6v12h-6zM38 40h6v6h-6zM56 40h10v6H56zM74 40h16v6H74zM14 54h6v8h-6zM36 56h12v6H36zM62 56h6v10h-6zM76 54h8v8h-8zM38 72h8v8h-8zM54 70h10v6H54zM70 72h6v12h-6zM82 74h10v8H82zM48 84h14v6H48z"
                          fill="#18222D"
                        />
                        {/* Center USD Symbol */}
                        <circle cx="50" cy="50" r="9" fill="#0B0D10" />
                        <text x="50" y="53.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="monospace">
                          $
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-[#56616A]">
                    <p className="text-sm font-bold text-[#18222D]">
                      Scan via ABA Mobile, ACLEDA, or Any KHQR App
                    </p>
                    <p>
                      Account Name: <strong className="text-[#18222D]">SPORT CASTLE CAMBODIA CO., LTD</strong>
                    </p>
                    <p>
                      Amount Due:{' '}
                      <strong className="font-mono text-[#18222D]">
                        {formatUsd(totals.totalUsd)}
                      </strong>{' '}
                      (<span className="font-mono">{formatKhr(totals.totalUsd)}</span>)
                    </p>
                    <p className="leading-relaxed">
                      Once you click &ldquo;Confirm Order&rdquo;, your receipt and custom printing ticket will be generated instantly for Telegram verification.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === 'wing-acleda' && (
                <div className="rounded-xl border border-[#18222D]/12 bg-[#F5F7F8] p-5 text-xs space-y-2 text-[#56616A]">
                  <p className="text-sm font-bold text-[#18222D]">
                    Wing Bank / ACLEDA Direct Transfer
                  </p>
                  <p>
                    ACLEDA USD Account: <strong className="font-mono text-[#18222D]">0001-03-889261-1-8</strong>
                  </p>
                  <p>
                    Wing Account: <strong className="font-mono text-[#18222D]">012 889 261 (Sport Castle)</strong>
                  </p>
                  <p>
                    Attach your transfer screenshot when sending your Order ID to @SportCastleKH on Telegram.
                  </p>
                </div>
              )}

              {paymentMethod === 'cod' && (
                <div className="rounded-xl border border-[#18222D]/12 bg-[#F5F7F8] p-5 text-xs space-y-2 text-[#56616A]">
                  <p className="text-sm font-bold text-[#18222D]">
                    Cash on Delivery (Phnom Penh)
                  </p>
                  <p>
                    Pay <strong className="font-mono text-[#18222D]">{formatUsd(totals.totalUsd)}</strong> (or{' '}
                    <strong className="font-mono text-[#18222D]">{formatKhr(totals.totalUsd)}</strong>) in cash or KHQR upon rider arrival.
                  </p>
                  <p>
                    Note: Custom-printed jerseys require quick Telegram confirmation before heat-pressing begins.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex h-11 items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#5A5D57] hover:text-[#0E1113] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePlaceOrder()}
                  className="inline-flex h-12 items-center gap-2 bg-[#0E1113] px-7 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirm Order — {formatUsd(totals.totalUsd)}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ORDER CONFIRMATION RECEIPT */}
          {step === 4 && completedOrder && (
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-[#0E1113]/10 pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#032EA1]">
                    <Check className="h-4 w-4" />
                    Order Confirmed · {completedOrder.status}
                  </span>
                  <h2 className="mt-1 font-display text-2xl font-extrabold uppercase text-[#0E1113]">
                    Receipt #{completedOrder.id}
                  </h2>
                  <p className="mt-1 text-xs text-[#56616A]">
                    Customer: {completedOrder.customer.fullName} · {completedOrder.customer.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold tabular-nums text-[#18222D]">
                    {formatUsd(completedOrder.totalUsd)}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-[#56616A]">
                    {formatKhr(completedOrder.totalUsd)}
                  </p>
                </div>
              </div>

              {/* Fulfillment & Payment Recap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg bg-[#F5F7F8] p-4">
                  <p className="font-bold uppercase tracking-[0.08em] text-[#56616A]">
                    Fulfillment
                  </p>
                  <p className="mt-1 font-semibold text-[#18222D]">
                    {completedOrder.fulfillmentMethod === 'delivery'
                      ? 'Phnom Penh Express Same-Day Delivery'
                      : `Store Pickup · ${selectedPickupEstimate?.branch.name ?? completedOrder.pickupBranch?.toUpperCase()}`}
                  </p>
                  {completedOrder.fulfillmentMethod === 'delivery' ? (
                    <p className="mt-0.5 text-[#56616A]">
                      {completedOrder.customer.streetAddress},{' '}
                      {completedOrder.customer.sangkat && `${completedOrder.customer.sangkat}, `}
                      {completedOrder.customer.khan}
                    </p>
                  ) : (
                    selectedPickupEstimate && (
                      <div className="mt-1 space-y-0.5 text-[#56616A]">
                        <p>{selectedPickupEstimate.branch.address}</p>
                        <p className="font-mono text-[11px] font-bold text-[#032EA1]">
                          {selectedPickupEstimate.readyHeadline}
                        </p>
                      </div>
                    )
                  )}
                </div>
                <div className="rounded-lg bg-[#F5F7F8] p-4">
                  <p className="font-bold uppercase tracking-[0.08em] text-[#56616A]">
                    Payment Method
                  </p>
                  <p className="mt-1 font-semibold uppercase text-[#18222D]">
                    {completedOrder.paymentMethod.replace('-', ' ')}
                  </p>
                  {completedOrder.customer.telegram && (
                    <p className="mt-0.5 font-mono text-[#56616A]">
                      Updates to {completedOrder.customer.telegram}
                    </p>
                  )}
                </div>
              </div>

              {/* Itemized Custom Print Summary */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#56616A] mb-3">
                  Items &amp; Custom Printing Specs
                </p>
                <ul className="divide-y divide-[#18222D]/10 border-t border-b border-[#18222D]/10">
                  {completedOrder.items.map((item) => (
                    <li
                      key={item.lineId}
                      className="flex items-start justify-between gap-4 py-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#18222D]">
                          {item.quantity}x {item.name} ({item.size})
                        </p>
                        {item.customPrint?.enabled && (
                          <p className="mt-0.5 font-mono text-[11px] text-[#032EA1]">
                            HEAT-PRESS: {item.customPrint.playerName || 'NO NAME'} #
                            {item.customPrint.squadNumber || '--'} ·{' '}
                            {getPatchLabel(item.customPrint.patch)}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-[#18222D]">
                        {formatUsd(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Telegram Receipt Copy & Dispatch Action */}
              <div className="rounded-xl bg-[#0B0D10] p-5 text-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D4AF37]">
                      Instant Telegram Dispatch
                    </p>
                    <p className="mt-0.5 text-xs text-white/75">
                      Send this formatted receipt to @SportCastleKH for immediate heat-press &amp; rider dispatch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyTelegramReceipt}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-xs font-semibold text-[#0B0D10] hover:bg-[#DFE5EB] cursor-pointer"
                  >
                    {telegramCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#032EA1]" />
                        <span>Receipt Copied for Telegram</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Order Receipt to Sport Castle Telegram</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="overflow-x-auto rounded-lg bg-white/10 p-3 font-mono text-[11px] leading-relaxed text-white/85 whitespace-pre-wrap">
                  {formatTelegramOrderMessage(completedOrder)}
                </pre>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'orders',
                      orderId: completedOrder.id,
                      email: completedOrder.customer.email,
                    })
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[#18222D] px-5 text-xs font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
                >
                  <span>Track Order #{completedOrder.id}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'home' })}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-[#18222D]/20 px-5 text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer"
                >
                  <span>Continue Shopping</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT STICKY ORDER SUMMARY */}
        {step < 4 && (
          <aside className="lg:col-span-5 lg:sticky lg:top-24 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 space-y-4">
            <h2 className="font-display text-base font-extrabold uppercase tracking-[0.04em] text-[#0E1113]">
              Order Summary ({totals.itemCount} Item{totals.itemCount === 1 ? '' : 's'})
            </h2>

            <ul className="divide-y divide-[#0E1113]/10 max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <li key={item.lineId} className="flex gap-3 py-3">
                  <ProductMedia
                    product={item}
                    className="h-14 w-14 shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-semibold text-[#0E1113]">
                      {item.name}
                    </p>
                    <p className="text-[#5A5D57]">
                      Size {item.size} · Qty {item.quantity}
                    </p>
                    {item.customPrint?.enabled && (
                      <p className="font-mono text-[10.5px] text-[#032EA1]">
                        Print: {item.customPrint.playerName || 'NO NAME'} #
                        {item.customPrint.squadNumber || '--'}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#0E1113]">
                    {formatUsd(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-[#0E1113]/10 pt-4 text-xs">
              <div className="flex justify-between text-[#5A5D57]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-[#0E1113]">
                  {formatUsd(totals.subtotal)}
                </span>
              </div>
              {totals.teamDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Squad Bulk Discount (-10%)</span>
                  <span className="font-mono tabular-nums">
                    -{formatUsd(totals.teamDiscount)}
                  </span>
                </div>
              )}
              {totals.promoDiscount > 0 && (
                <div className="flex justify-between text-[#032EA1]">
                  <span>Promo ({promoCode})</span>
                  <span className="font-mono tabular-nums">
                    -{formatUsd(totals.promoDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#5A5D57]">
                <span>
                  {fulfillmentMethod === 'delivery'
                    ? 'Phnom Penh Express'
                    : `Store Pickup · ${selectedPickupEstimate?.branch.shortName ?? 'Branch'}`}
                </span>
                <span className="font-mono tabular-nums text-[#0E1113]">
                  {totals.shippingFee === 0 ? 'FREE' : formatUsd(totals.shippingFee)}
                </span>
              </div>
              {fulfillmentMethod === 'pickup' && selectedPickupEstimate && (
                <div
                  data-testid="summary-pickup-estimate"
                  className="border border-[#0E1113]/15 bg-[#F4F2EC]/75 px-3 py-2 text-[11px]"
                >
                  <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#0E1113] uppercase">
                    {selectedPickupEstimate.branch.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#032EA1] tabular-nums">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{selectedPickupEstimate.readyWindowLabel}</span>
                    <span className="text-[#5A5D57] font-normal">
                      ({selectedPickupEstimate.durationLabel})
                    </span>
                  </p>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-[#0E1113]/10 pt-3">
                <span className="text-sm font-bold text-[#0E1113]">Total</span>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold tabular-nums text-[#0E1113]">
                    {formatUsd(totals.totalUsd)}
                  </div>
                  <div className="font-mono text-[11px] tabular-nums text-[#5A5D57]">
                    ≈ {formatKhr(totals.totalUsd)} (1 USD = 4,100 KHR)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-[#0E1113]/10 bg-[#F4F2EC]/60 p-3 text-[11px] text-[#5A5D57]">
              <Copy className="h-3.5 w-3.5 shrink-0" />
              <span>Need help? Telegram @SportCastleKH · Daily 08:30 – 20:30</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

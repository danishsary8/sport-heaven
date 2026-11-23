import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Check,
  CreditCard,
  Heart,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingDown,
  Truck,
  User,
} from 'lucide-react';
import {
  BOOT_SIZES,
  BRANCHES,
  JERSEY_SIZES,
  PHNOM_PENH_KHANS,
} from '../data/catalog';
import { useStore } from '../context/StoreContext';
import type { AccountSection, BranchId } from '../types/store';
import {
  formatKhr,
  formatUsd,
  getPatchLabel,
} from '../utils/commerce';
import { calculateProMemberProgress } from '../utils/loyaltyTier';
import {
  formatOrderDate,
  getOrderStatusMeta,
} from '../utils/orderHistory';
import { LoyaltyTierProgress } from '../components/account/LoyaltyTierProgress';
import { MyOrdersSection } from '../components/account/MyOrdersSection';
import { OrderTransitTimeline } from '../components/account/OrderTransitTimeline';
import { PurchaseInsightsCard } from '../components/account/PurchaseInsightsCard';

interface AccountPageProps {
  section?: AccountSection;
  orderId?: string;
}

export function AccountPage({ section = 'overview', orderId }: AccountPageProps) {
  const {
    catalog,
    isAuthenticated,
    logoutMember,
    memberProfile,
    updateMemberProfile,
    addresses,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    savedPayments,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPayment,
    orders,
    reorderOrder,
    wishlist,
    wishlistAlerts,
    toggleWishlist,
    addToCart,
    navigate,
    openSizeGuide,
  } = useStore();

  const [formState, setFormState] = useState(memberProfile);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Address Book Form
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: '',
    type: 'shipping' as 'shipping' | 'billing',
    fullName: memberProfile.fullName,
    phone: memberProfile.phone,
    khan: 'Khan Toul Kork',
    sangkat: '',
    streetAddress: '',
    isDefault: false,
  });

  // Payment Vault Form
  const [showPayForm, setShowPayForm] = useState(false);
  const [newPay, setNewPay] = useState({
    type: 'card' as 'card' | 'aba-khqr' | 'wing',
    brand: 'Visa',
    last4: '',
    expiry: '08/29',
    holderName: memberProfile.fullName.toUpperCase(),
    isDefault: false,
  });

  useEffect(() => {
    setFormState(memberProfile);
  }, [memberProfile]);

  const loyalty = calculateProMemberProgress(orders);
  const savedProducts = wishlist
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const inspectedOrder = orderId
    ? orders.find((o) => o.id.toUpperCase() === orderId.toUpperCase()) ?? null
    : null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMemberProfile(formState);
    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 1800);
  };

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.label.trim() || !newAddr.streetAddress.trim()) return;
    addAddress(newAddr);
    setShowAddrForm(false);
    setNewAddr({
      label: '',
      type: 'shipping',
      fullName: memberProfile.fullName,
      phone: memberProfile.phone,
      khan: 'Khan Toul Kork',
      sangkat: '',
      streetAddress: '',
      isDefault: false,
    });
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLast4 = newPay.last4.replace(/\D/g, '').slice(-4);
    if (cleanLast4.length < 4) return;
    addPaymentMethod({
      ...newPay,
      last4: cleanLast4,
    });
    setShowPayForm(false);
    setNewPay({
      type: 'card',
      brand: 'Visa',
      last4: '',
      expiry: '08/29',
      holderName: memberProfile.fullName.toUpperCase(),
      isDefault: false,
    });
  };

  const navItems: Array<{
    key: AccountSection;
    label: string;
    path: string;
    icon: typeof User;
  }> = [
    { key: 'overview', label: 'Dashboard & Fit', path: '/account', icon: User },
    {
      key: 'orders',
      label: `My Orders (${orders.length})`,
      path: '/account/orders',
      icon: Package,
    },
    {
      key: 'addresses',
      label: `Address Book (${addresses.length})`,
      path: '/account/addresses',
      icon: MapPin,
    },
    {
      key: 'payments',
      label: `Payment Vault (${savedPayments.length})`,
      path: '/account/payments',
      icon: CreditCard,
    },
    {
      key: 'wishlist',
      label: `Wishlist (${savedProducts.length})`,
      path: '/account/wishlist',
      icon: Heart,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      {/* Top Member Loyalty Header */}
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#B8933B] uppercase">
                  SPORT CASTLE CLUB · PHNOM PENH MEMBER
                </p>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'login' })}
                    className="bg-[#C8232C] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#FDFCF9] uppercase"
                  >
                    Guest Preview — Sign In
                  </button>
                )}
              </div>
              <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
                {memberProfile.fullName}
              </h1>
              <p className="mt-1.5 font-mono text-xs text-[#FDFCF9]/70">
                {memberProfile.email} · {memberProfile.phone} · Sizes:{' '}
                <span className="font-bold text-[#FDFCF9]">
                  {memberProfile.preferredBootSize} / {memberProfile.preferredJerseySize}
                </span>
              </p>

              {/* Compact Header Loyalty Progress Bar toward Pro Member */}
              <div className="mt-5 max-w-lg">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#B8933B] uppercase">
                    <Award className="h-4 w-4" aria-hidden="true" />
                    {loyalty.currentTier.name}
                  </span>
                  <span className="text-[#FDFCF9]/80 tabular-nums">
                    {loyalty.points.toLocaleString('en-US')} /{' '}
                    {loyalty.proThresholdPoints.toLocaleString('en-US')} PTS ·{' '}
                    {loyalty.progressToProPct}%
                  </span>
                </div>
                <div className="relative mt-2.5">
                  <div
                    role="progressbar"
                    aria-label="Header progress toward Pro Member status"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={loyalty.progressToProPct}
                    className="h-1.5 w-full overflow-hidden bg-[#FDFCF9]/15"
                  >
                    <div
                      className="h-full bg-[#B8933B] transition-[width] duration-500 motion-reduce:transition-none"
                      style={{ width: `${loyalty.progressToProPct}%` }}
                    />
                  </div>
                  {/* Subtle milestone markers at Silver (30%) and Gold (60%) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-[30%] h-1.5 w-px -translate-x-1/2 bg-[#0E1113]/65"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-[60%] h-1.5 w-px -translate-x-1/2 bg-[#0E1113]/65"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] uppercase">
                  {loyalty.milestones.map((m) => (
                    <span
                      key={m.id}
                      className={
                        m.isCurrent
                          ? 'font-bold text-[#B8933B]'
                          : m.reached
                            ? 'text-[#FDFCF9]/80'
                            : 'text-[#FDFCF9]/40'
                      }
                    >
                      {m.badgeLabel}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-[#FDFCF9]/65">
                  {loyalty.isProMember
                    ? 'Pro Member unlocked — complimentary priority heat-press printing & free same-day Phnom Penh delivery'
                    : `${formatUsd(loyalty.amountRemainingToProUsd)} (${loyalty.pointsRemainingToPro.toLocaleString('en-US')} pts) away from Pro Member status`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[#FDFCF9]/15 pt-6 sm:gap-3 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <button
                type="button"
                onClick={() => navigate({ page: 'account', section: 'orders' })}
                className="min-w-0 border border-[#FDFCF9]/12 bg-[#FDFCF9]/5 p-3 text-left transition hover:border-[#B8933B] sm:p-4"
              >
                <p className="font-mono text-lg font-bold tabular-nums sm:text-2xl">
                  {orders.length}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#FDFCF9]/60 uppercase sm:text-[10px] sm:tracking-[0.16em]">
                  My Orders
                </p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'account', section: 'wishlist' })}
                className="min-w-0 border border-[#FDFCF9]/12 bg-[#FDFCF9]/5 p-3 text-left transition hover:border-[#B8933B] sm:p-4"
              >
                <p className="font-mono text-lg font-bold tabular-nums sm:text-2xl">
                  {savedProducts.length}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#FDFCF9]/60 uppercase sm:text-[10px] sm:tracking-[0.16em]">
                  Saved
                </p>
              </button>
              <div className="min-w-0 border border-[#FDFCF9]/12 bg-[#FDFCF9]/5 p-3 sm:p-4">
                <p className="truncate font-mono text-lg font-bold tabular-nums sm:text-2xl">
                  {formatUsd(loyalty.totalSpentUsd)}
                </p>
                <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#FDFCF9]/60 uppercase sm:text-[10px] sm:tracking-[0.16em]">
                  Lifetime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        {/* Canonical Sub-Route Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0E1113]/15 pb-4">
          <nav
            aria-label="Account sections"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => navigate({ page: 'account', section: item.key })}
                  className={`inline-flex shrink-0 items-center gap-2 px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] uppercase transition ${
                    active
                      ? 'bg-[#0E1113] text-[#FDFCF9]'
                      : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75 hover:border-[#0E1113]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  logoutMember();
                  navigate({ page: 'login' });
                }}
                className="inline-flex items-center gap-1.5 border border-[#0E1113]/20 bg-[#FDFCF9] px-3.5 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113] uppercase hover:border-[#C8232C] hover:text-[#C8232C]"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate({ page: 'login' })}
                className="bg-[#C8232C] px-4 py-2 font-mono text-[10px] font-bold tracking-[0.14em] text-[#FDFCF9] uppercase"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* SECTION 1: OVERVIEW, LOYALTY PROGRESS, FIT PROFILE & RECENT MY ORDERS */}
        {section === 'overview' && (
          <div>
            <LoyaltyTierProgress orders={orders} onNavigate={navigate} />

            <PurchaseInsightsCard orders={orders} onNavigate={navigate} />

            <form
              onSubmit={handleSaveProfile}
              className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12"
            >
            <div className="space-y-5 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 lg:col-span-7">
              <div className="flex items-center justify-between border-b border-[#0E1113]/10 pb-3">
                <h2 className="font-display text-2xl font-extrabold uppercase">
                  Personal &amp; Delivery Profile
                </h2>
                <span className="font-mono text-[10px] text-[#0E1113]/50 uppercase">
                  /account
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formState.fullName}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, fullName: e.target.value }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm outline-none focus:border-[#0E1113]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, email: e.target.value }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm outline-none focus:border-[#0E1113]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Phone (+855)
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, phone: e.target.value }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-sm outline-none focus:border-[#0E1113]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={formState.telegram}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, telegram: e.target.value }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-sm outline-none focus:border-[#0E1113]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-[#0E1113]/10 pt-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Default Phnom Penh Khan
                  </label>
                  <select
                    value={formState.savedKhan}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, savedKhan: e.target.value }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm"
                  >
                    {PHNOM_PENH_KHANS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                    Home Pickup Branch
                  </label>
                  <select
                    value={formState.homeBranch}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        homeBranch: e.target.value as BranchId,
                      }))
                    }
                    className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113]/65 uppercase">
                  Primary Street / Landmark
                </label>
                <input
                  type="text"
                  value={formState.savedAddress}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, savedAddress: e.target.value }))
                  }
                  className="h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm"
                />
              </div>
            </div>

            {/* Right Saved Fit Profile */}
            <div className="flex flex-col justify-between space-y-6 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 lg:col-span-5">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-extrabold uppercase">
                      Saved Fit Sizes
                    </h2>
                    <p className="text-xs text-[#0E1113]/60">
                      Auto-highlighted across Quick-Size &amp; PDP
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSizeGuide('boots')}
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#C8232C] uppercase hover:underline"
                  >
                    <Ruler className="h-3.5 w-3.5" /> Fit Chart
                  </button>
                </div>

                <div>
                  <span className="block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/60 uppercase">
                    Boot Size (EU)
                  </span>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {BOOT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setFormState((s) => ({ ...s, preferredBootSize: size }))
                        }
                        className={`h-9 border font-mono text-xs font-bold transition ${
                          formState.preferredBootSize === size
                            ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                            : 'border-[#0E1113]/15 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                        }`}
                      >
                        {size.replace('EU ', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/60 uppercase">
                    Jersey Size
                  </span>
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {JERSEY_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setFormState((s) => ({ ...s, preferredJerseySize: size }))
                        }
                        className={`h-9 border font-mono text-xs font-bold transition ${
                          formState.preferredJerseySize === size
                            ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                            : 'border-[#0E1113]/15 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-[#0E1113] font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C]"
              >
                {savedFeedback ? (
                  <>
                    <Check className="h-4 w-4" /> Preferences Saved
                  </>
                ) : (
                  <span>Save Member Profile</span>
                )}
              </button>
            </div>
            </form>

            <MyOrdersSection
              orders={orders}
              memberEmail={memberProfile.email}
              mode="summary"
              onNavigate={navigate}
              onReorder={reorderOrder}
              onViewAllOrders={() => navigate({ page: 'account', section: 'orders' })}
            />
          </div>
        )}

        {/* SECTION 2: MY ORDERS & INDIVIDUAL ORDER INVOICE (/account/orders & /account/orders/[id]) */}
        {section === 'orders' && (
          <div className="mt-8">
            {inspectedOrder ? (
              <div className="border-2 border-[#0E1113] bg-[#FDFCF9] p-6 sm:p-10">
                <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#0E1113]/15 pb-4">
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'account', section: 'orders' })}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#0E1113] uppercase hover:text-[#C8232C]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to My Orders
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          page: 'orders',
                          orderId: inspectedOrder.id,
                          email: inspectedOrder.customer.email || memberProfile.email,
                        })
                      }
                      className="inline-flex items-center gap-1.5 border border-[#032EA1] bg-[#032EA1]/5 px-4 py-2 font-mono text-[11px] font-bold text-[#032EA1] uppercase hover:bg-[#032EA1] hover:text-[#FDFCF9]"
                    >
                      <Truck className="h-3.5 w-3.5" /> Track Live
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 border border-[#0E1113] px-4 py-2 font-mono text-[11px] font-bold uppercase hover:bg-[#0E1113] hover:text-[#FDFCF9]"
                    >
                      <Printer className="h-3.5 w-3.5" /> Download / Print PDF Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderOrder(inspectedOrder)}
                      className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> 1-Click Reorder
                    </button>
                  </div>
                </div>

                {/* Printable Invoice Header */}
                <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#0E1113]/15 pb-6">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#B8933B] uppercase">
                      SPORT CASTLE CAMBODIA · TAX INVOICE
                    </p>
                    <h2 className="mt-1 font-display text-4xl font-extrabold uppercase">
                      Order #{inspectedOrder.id}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5 font-mono text-xs text-[#0E1113]/65">
                      <span>Date: {formatOrderDate(inspectedOrder.createdAt)}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] uppercase ${getOrderStatusMeta(inspectedOrder.status).badgeClass}`}
                      >
                        {inspectedOrder.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p className="font-bold text-[#0E1113]">
                      {inspectedOrder.customer.fullName}
                    </p>
                    <p className="text-[#0E1113]/70">{inspectedOrder.customer.phone}</p>
                    <p className="text-[#0E1113]/70">
                      {inspectedOrder.fulfillmentMethod === 'delivery'
                        ? `${inspectedOrder.customer.streetAddress}, ${inspectedOrder.customer.khan}`
                        : `In-Store Pickup · ${inspectedOrder.pickupBranch?.toUpperCase()}`}
                    </p>
                  </div>
                </div>

                {/* Live Visual Transit Timeline */}
                <div className="no-print mt-6 border border-[#0E1113]/15">
                  <OrderTransitTimeline
                    order={inspectedOrder}
                    variant="detailed"
                    className="border-b-0"
                  />
                </div>

                {/* Invoice Items */}
                <div className="mt-6 divide-y divide-[#0E1113]/10 border-b border-[#0E1113]/15">
                  {inspectedOrder.items.map((item) => (
                    <div
                      key={item.lineId}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-14 w-14 border border-[#0E1113]/10 bg-[#EAE7DF] object-contain p-1"
                        />
                        <div>
                          <p className="font-display text-lg font-bold uppercase">
                            {item.name}
                          </p>
                          <p className="font-mono text-[11px] text-[#0E1113]/60">
                            Size {item.size} · Qty {item.quantity} ·{' '}
                            {formatUsd(item.unitPrice)} each
                          </p>
                          {item.customPrint?.enabled && (
                            <p className="font-mono text-[10px] font-bold text-[#C8232C]">
                              PRINT: {item.customPrint.playerName || 'NONE'} #
                              {item.customPrint.squadNumber || '--'} ·{' '}
                              {getPatchLabel(item.customPrint.patch)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {formatUsd(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-6 ml-auto max-w-xs space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#0E1113]/60">Subtotal</span>
                    <span>{formatUsd(inspectedOrder.subtotal)}</span>
                  </div>
                  {inspectedOrder.teamDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Squad Discount</span>
                      <span>-{formatUsd(inspectedOrder.teamDiscount)}</span>
                    </div>
                  )}
                  {inspectedOrder.promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Promo ({inspectedOrder.promoCode})</span>
                      <span>-{formatUsd(inspectedOrder.promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#0E1113]/60">Shipping</span>
                    <span>
                      {inspectedOrder.shippingFee === 0
                        ? 'FREE'
                        : formatUsd(inspectedOrder.shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#0E1113]/20 pt-2 text-base font-bold">
                    <span>Total Paid</span>
                    <span>{formatUsd(inspectedOrder.totalUsd)}</span>
                  </div>
                  <p className="text-right text-[11px] text-[#0E1113]/55">
                    ≈ {formatKhr(inspectedOrder.totalUsd)} · Paid via{' '}
                    {inspectedOrder.paymentMethod.toUpperCase()}
                  </p>
                </div>
              </div>
            ) : (
              <MyOrdersSection
                orders={orders}
                memberEmail={memberProfile.email}
                mode="full"
                onNavigate={navigate}
                onReorder={reorderOrder}
              />
            )}
          </div>
        )}

        {/* SECTION 3: ADDRESS BOOK (/account/addresses) */}
        {section === 'addresses' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold uppercase">
                  Saved Phnom Penh Addresses
                </h2>
                <p className="text-xs text-[#0E1113]/65">
                  Manage shipping &amp; billing addresses for 1-click rider checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddrForm((v) => !v)}
                className="inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
              >
                <Plus className="h-3.5 w-3.5" /> Add New Address
              </button>
            </div>

            {showAddrForm && (
              <form
                onSubmit={handleCreateAddress}
                className="grid grid-cols-1 gap-4 border-2 border-[#0E1113] bg-[#FDFCF9] p-6 sm:grid-cols-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Label (e.g. Home — Sen Sok, Pitch Locker)"
                  value={newAddr.label}
                  onChange={(e) => setNewAddr((s) => ({ ...s, label: e.target.value }))}
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                />
                <select
                  value={newAddr.type}
                  onChange={(e) =>
                    setNewAddr((s) => ({
                      ...s,
                      type: e.target.value as 'shipping' | 'billing',
                    }))
                  }
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                >
                  <option value="shipping">Shipping Address</option>
                  <option value="billing">Billing Address</option>
                </select>
                <select
                  value={newAddr.khan}
                  onChange={(e) => setNewAddr((s) => ({ ...s, khan: e.target.value }))}
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                >
                  {PHNOM_PENH_KHANS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Sangkat / Commune (e.g. Boeung Kak 1)"
                  value={newAddr.sangkat}
                  onChange={(e) =>
                    setNewAddr((s) => ({ ...s, sangkat: e.target.value }))
                  }
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Street, House No. or Pitch Landmark"
                  value={newAddr.streetAddress}
                  onChange={(e) =>
                    setNewAddr((s) => ({ ...s, streetAddress: e.target.value }))
                  }
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm sm:col-span-2"
                />
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={newAddr.isDefault}
                    onChange={(e) =>
                      setNewAddr((s) => ({ ...s, isDefault: e.target.checked }))
                    }
                    className="h-4 w-4 accent-[#0E1113]"
                  />
                  Set as Default Checkout Address
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddrForm(false)}
                    className="border border-[#0E1113]/20 px-4 py-2 font-mono text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0E1113] px-5 py-2 font-mono text-xs font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`flex flex-col justify-between border bg-[#FDFCF9] p-6 ${
                    addr.isDefault ? 'border-2 border-[#0E1113]' : 'border-[#0E1113]/15'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#B8933B] uppercase">
                        {addr.type} ADDRESS
                      </span>
                      {addr.isDefault && (
                        <span className="bg-[#0E1113] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FDFCF9] uppercase">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-extrabold uppercase">
                      {addr.label}
                    </h3>
                    <p className="mt-1 text-sm text-[#0E1113]/80">{addr.streetAddress}</p>
                    <p className="text-xs text-[#0E1113]/65">
                      {addr.sangkat ? `${addr.sangkat}, ` : ''}
                      {addr.khan}, Phnom Penh
                    </p>
                    <p className="mt-2 font-mono text-xs text-[#0E1113]/60">
                      {addr.fullName} · {addr.phone}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#0E1113]/10 pt-4">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(addr.id)}
                        className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#0E1113] uppercase hover:text-[#C8232C]"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-emerald-700 uppercase">
                        Active Default
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteAddress(addr.id)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#0E1113]/55 uppercase hover:text-[#C8232C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: SAVED PAYMENT VAULT (/account/payments) */}
        {section === 'payments' && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold uppercase">
                  Tokenized Payment Vault
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-[#0E1113]/65">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  PCI-DSS tokenized vault — raw card numbers are never stored in browser or database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayForm((v) => !v)}
                className="inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Payment Method
              </button>
            </div>

            {showPayForm && (
              <form
                onSubmit={handleCreatePayment}
                className="grid grid-cols-1 gap-4 border-2 border-[#0E1113] bg-[#FDFCF9] p-6 sm:grid-cols-2"
              >
                <select
                  value={newPay.type}
                  onChange={(e) => {
                    const t = e.target.value as 'card' | 'aba-khqr' | 'wing';
                    setNewPay((s) => ({
                      ...s,
                      type: t,
                      brand:
                        t === 'aba-khqr'
                          ? 'ABA Pay / KHQR'
                          : t === 'wing'
                            ? 'Wing Bank'
                            : 'Visa',
                    }));
                  }}
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                >
                  <option value="card">Credit / Debit Card (Visa / Mastercard)</option>
                  <option value="aba-khqr">ABA Pay / KHQR Account</option>
                  <option value="wing">Wing Bank Wallet</option>
                </select>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Last 4 digits (e.g. 9012)"
                  value={newPay.last4}
                  onChange={(e) => setNewPay((s) => ({ ...s, last4: e.target.value }))}
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 font-mono text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Cardholder / Account Name"
                  value={newPay.holderName}
                  onChange={(e) =>
                    setNewPay((s) => ({ ...s, holderName: e.target.value }))
                  }
                  className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm"
                />
                {newPay.type === 'card' && (
                  <input
                    type="text"
                    placeholder="Expiry (MM/YY)"
                    value={newPay.expiry}
                    onChange={(e) =>
                      setNewPay((s) => ({ ...s, expiry: e.target.value }))
                    }
                    className="border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 font-mono text-sm"
                  />
                )}
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowPayForm(false)}
                    className="border border-[#0E1113]/20 px-4 py-2 font-mono text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0E1113] px-5 py-2 font-mono text-xs font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                  >
                    Tokenize &amp; Save
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {savedPayments.map((pm) => (
                <div
                  key={pm.id}
                  className={`flex flex-col justify-between border bg-[#FDFCF9] p-6 ${
                    pm.isDefault ? 'border-2 border-[#0E1113]' : 'border-[#0E1113]/15'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#0E1113] uppercase">
                        {pm.brand}
                      </span>
                      {pm.isDefault && (
                        <span className="bg-[#0E1113] px-2 py-0.5 font-mono text-[10px] font-bold text-[#FDFCF9] uppercase">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-mono text-xl font-bold tracking-[0.16em] text-[#0E1113]">
                      •••• •••• •••• {pm.last4}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[#0E1113]/60">
                      {pm.holderName} {pm.expiry ? `· EXP ${pm.expiry}` : ''} · Token:{' '}
                      {pm.vaultToken}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#0E1113]/10 pt-4">
                    {!pm.isDefault ? (
                      <button
                        type="button"
                        onClick={() => setDefaultPayment(pm.id)}
                        className="font-mono text-[10px] font-bold uppercase hover:text-[#C8232C]"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] text-emerald-700 uppercase">
                        Primary Express Pay
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(pm.id)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#0E1113]/55 uppercase hover:text-[#C8232C]"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Revoke Token
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: WISHLIST WITH RESTOCK ALERTS & MOVE TO CART (/account/wishlist) */}
        {section === 'wishlist' && (
          <div className="mt-8">
            {savedProducts.length === 0 ? (
              <div className="border border-[#0E1113]/15 bg-[#FDFCF9] py-16 text-center">
                <Heart className="mx-auto h-8 w-8 text-[#0E1113]/35" />
                <p className="mt-3 font-display text-2xl font-extrabold uppercase">
                  Your Wishlist is Empty
                </p>
                <p className="mt-1 text-xs text-[#0E1113]/65">
                  Save boots, 2026/27 kits, or F1 jerseys to monitor stock alerts and move to bag in 1 click.
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'shop', collectionSlug: 'all' })}
                  className="mt-5 bg-[#0E1113] px-5 py-3 font-mono text-xs font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                >
                  Explore Master Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0E1113]/15 pb-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                      PRICE &amp; RESTOCK MONITOR
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-extrabold uppercase">
                      Saved Gear ({savedProducts.length})
                    </h2>
                    <p className="text-xs text-[#5A5D57]">
                      {wishlistAlerts.activeAlertCount} of {savedProducts.length} items monitored for Phnom Penh branch restocks &amp; price drops.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => wishlistAlerts.checkForUpdates()}
                    className="inline-flex items-center gap-2 border border-[#0E1113] bg-[#FDFCF9] px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-[#0E1113] uppercase transition hover:bg-[#0E1113] hover:text-[#FDFCF9]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Check Stock &amp; Price Drops</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {savedProducts.map((product) => {
                    const alertOn = wishlistAlerts.isAlertEnabled(product.id);
                    const latestEvent = wishlistAlerts.getLatestEventForProduct(product.id);
                    const hasMarkdown =
                      typeof product.originalPrice === 'number' &&
                      product.originalPrice > product.price;
                    const preferredSize =
                      product.category === 'boots'
                        ? product.sizes.includes(memberProfile.preferredBootSize)
                          ? memberProfile.preferredBootSize
                          : product.sizes[0]
                        : product.sizes.includes(memberProfile.preferredJerseySize)
                          ? memberProfile.preferredJerseySize
                          : product.sizes[0];
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col border border-[#0E1113]/15 bg-[#FDFCF9]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ page: 'product', slug: product.slug }, product.slug)
                          }
                          className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE7DF] p-4"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-contain"
                          />
                          {latestEvent && (
                            <span
                              className={`absolute top-3 left-3 inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] uppercase ${
                                latestEvent.type === 'price-drop'
                                  ? 'border-[#B8933B] bg-[#0E1113] text-[#B8933B]'
                                  : 'border-emerald-700 bg-[#0E1113] text-emerald-400'
                              }`}
                            >
                              {latestEvent.type === 'price-drop' ? (
                                <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
                              ) : (
                                <PackageCheck className="h-2.5 w-2.5" aria-hidden="true" />
                              )}
                              <span>{latestEvent.title}</span>
                            </span>
                          )}
                        </button>
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <p className="font-mono text-[10px] text-[#0E1113]/55 uppercase">
                              {product.brand} · {product.colorway}
                            </p>
                            <h3 className="mt-1 font-display text-xl font-extrabold uppercase">
                              {product.name}
                            </h3>
                            <div className="mt-1 flex items-baseline gap-2">
                              <p className="font-mono text-sm font-bold text-[#0E1113] tabular-nums">
                                {formatUsd(product.price)}
                              </p>
                              {hasMarkdown && (
                                <span className="font-mono text-xs text-[#5A5D57] line-through tabular-nums">
                                  {formatUsd(product.originalPrice!)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 space-y-2 border-t border-[#0E1113]/10 pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                addToCart(product, preferredSize, 1, undefined, true)
                              }
                              className="flex w-full items-center justify-center gap-2 bg-[#0E1113] py-2.5 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              Move to Cart ({preferredSize})
                            </button>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                aria-pressed={alertOn}
                                onClick={() => wishlistAlerts.toggleItemAlert(product.id)}
                                className={`inline-flex flex-1 items-center justify-center gap-1.5 border py-2 font-mono text-[10px] font-bold uppercase ${
                                  alertOn
                                    ? 'border-[#B8933B] bg-[#B8933B]/15 text-[#0E1113]'
                                    : 'border-[#0E1113]/15 text-[#0E1113]/70 hover:border-[#0E1113]'
                                }`}
                              >
                                <Bell className="h-3 w-3" />
                                {alertOn ? 'Alert Active' : 'Stock / Price Alert'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleWishlist(product.id)}
                                className="border border-[#0E1113]/15 px-3 py-2 font-mono text-[10px] text-[#0E1113]/60 uppercase hover:border-[#C8232C] hover:text-[#C8232C]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

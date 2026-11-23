import { useState } from 'react';
import { Calendar, Check, Gift, Mail, Package, ShoppingBag } from 'lucide-react';
import { STUDIO_IMAGES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { formatKhr, formatUsd, validateGiftCardInput } from '../utils/commerce';

const PRESET_AMOUNTS = [25, 50, 100, 150, 250];

export function GiftCardPage() {
  const { addGiftCardToCart, navigate } = useStore();

  const [format, setFormat] = useState<'digital' | 'physical'>('digital');
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('See you under the floodlights — pick your next matchday boots!');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const effectiveAmount = customAmount ? Number(customAmount) : amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGiftCardInput({
      amount: effectiveAmount,
      recipientEmail,
      recipientName,
    });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    addGiftCardToCart({
      format,
      amount: effectiveAmount,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail.trim(),
      message: message.trim(),
      deliveryDate,
    });
  };

  return (
    <div className="bg-[#F4F2EC] animate-page-reveal py-10">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5A5D57]">
          <button type="button" onClick={() => navigate({ page: 'home' })} className="hover:text-[#0E1113] cursor-pointer">
            Home
          </button>
          <span>/</span>
          <span className="text-[#0E1113] font-semibold">Gift Cards</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          {/* Left Metallic Gift Card Showcase + Live Preview */}
          <div className="lg:col-span-6 space-y-5">
            <div className="relative overflow-hidden border border-[#0E1113]/15 bg-[#EAE7DF] shadow-[8px_8px_0px_rgba(14,17,19,0.06)]">
              <img
                src={STUDIO_IMAGES.giftCardMetal}
                alt="Sport Castle Anodized Metal Gift Card"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute left-4 top-4 bg-[#0E1113] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#E5C56A]">
                {format === 'digital' ? 'INSTANT E-CARD' : 'ANODIZED METAL EDITION'}
              </div>
              <div className="absolute bottom-4 right-4 bg-[#FDFCF9]/95 border border-[#0E1113] px-4 py-2 text-right">
                <p className="font-mono text-xl font-bold text-[#0E1113]">
                  {Number.isFinite(effectiveAmount) && effectiveAmount > 0
                    ? formatUsd(effectiveAmount)
                    : '$0.00'}
                </p>
                <p className="font-mono text-[10px] text-[#5A5D57]">
                  ≈ {formatKhr(Math.max(0, effectiveAmount || 0))}
                </p>
              </div>
            </div>

            {/* Live Recipient Card Preview */}
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5A5D57]">
                LIVE DISPATCH PREVIEW
              </p>
              <div className="mt-3 flex items-baseline justify-between border-b border-[#0E1113]/10 pb-3">
                <div>
                  <p className="text-xs text-[#5A5D57]">To:</p>
                  <p className="font-display text-2xl font-bold uppercase text-[#0E1113]">
                    {recipientName.trim() || 'Your Teammate'}
                  </p>
                </div>
                <span className="font-mono text-xs text-[#5A5D57]">
                  Scheduled: {deliveryDate}
                </span>
              </div>
              <p className="mt-3 font-editorial italic text-lg text-[#0E1113]">
                “{message || 'Enjoy authentic boots, 2026/27 kits, or custom printing at Sport Castle.'}”
              </p>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5A5D57] border-t border-[#0E1113]/10 pt-3">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#032EA1]" />
                  Redeemable online &amp; all 3 Phnom Penh branches
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#032EA1]" />
                  No expiration date · Zero processing fees
                </li>
              </ul>
            </div>
          </div>

          {/* Right Configuration Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-6 border border-[#0E1113] bg-[#FDFCF9] p-6 sm:p-8 space-y-6"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#C8232C]">
                SPORT CASTLE PHNOM PENH · GIFT ATELIER
              </p>
              <h1 className="mt-1 font-display text-4xl font-extrabold uppercase text-[#0E1113]">
                Official Matchday Gift Card
              </h1>
              <p className="mt-1 text-sm text-[#5A5D57]">
                Let them choose their exact boot surface, 2026/27 club jersey, or custom heat-press
                nameset across Sonthormuk, Sen Sok &amp; Chomkadong.
              </p>
            </div>

            {/* Format Selector */}
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                01 · Card Format
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('digital')}
                  className={`flex items-start gap-3 border p-3.5 text-left transition-colors cursor-pointer ${
                    format === 'digital'
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/20 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase">Digital E-Card</p>
                    <p className={`text-[11px] mt-0.5 ${format === 'digital' ? 'text-white/75' : 'text-[#5A5D57]'}`}>
                      Instant email &amp; QR code
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('physical')}
                  className={`flex items-start gap-3 border p-3.5 text-left transition-colors cursor-pointer ${
                    format === 'physical'
                      ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                      : 'border-[#0E1113]/20 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                  }`}
                >
                  <Package className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold uppercase">Physical Metal Box</p>
                    <p className={`text-[11px] mt-0.5 ${format === 'physical' ? 'text-white/75' : 'text-[#5A5D57]'}`}>
                      Same-day Phnom Penh delivery
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount Selection */}
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                02 · Select Value (USD)
              </span>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {PRESET_AMOUNTS.map((val) => {
                  const selected = !customAmount && amount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAmount(val);
                        setCustomAmount('');
                      }}
                      className={`h-11 border font-mono text-sm font-semibold cursor-pointer transition-colors ${
                        selected
                          ? 'border-[#0E1113] bg-[#0E1113] text-[#FDFCF9]'
                          : 'border-[#0E1113]/20 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                      }`}
                    >
                      ${val}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min={10}
                max={500}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Or enter custom amount ($10 – $500)"
                className="mt-2.5 h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-xs text-[#0E1113] focus:border-[#0E1113] focus:outline-none"
              />
              {errors.amount && <p className="mt-1 text-xs text-[#C8232C]">{errors.amount}</p>}
            </div>

            {/* Recipient Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g., Piseth Dara"
                  className="mt-1.5 h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm focus:border-[#0E1113] focus:outline-none"
                />
                {errors.recipientName && (
                  <p className="mt-1 text-xs text-[#C8232C]">{errors.recipientName}</p>
                )}
              </div>
              <div>
                <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="player@phnompenh.kh"
                  className="mt-1.5 h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 text-sm focus:border-[#0E1113] focus:outline-none"
                />
                {errors.recipientEmail && (
                  <p className="mt-1 text-xs text-[#C8232C]">{errors.recipientEmail}</p>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                <Calendar className="h-3.5 w-3.5" />
                <span>Scheduled Delivery Date</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1.5 h-10 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-xs focus:border-[#0E1113] focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                <Gift className="h-3.5 w-3.5" />
                <span>Personal Message</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={180}
                className="mt-1.5 w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3 py-2 text-sm focus:border-[#0E1113] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 bg-[#0E1113] font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#FDFCF9] hover:bg-[#C8232C] transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>
                Add Gift Card to Bag — {formatUsd(Math.max(0, effectiveAmount || 0))}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

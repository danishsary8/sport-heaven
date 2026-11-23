import { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  MapPin,
  Phone,
  Send,
  Shirt,
} from 'lucide-react';
import { STUDIO_IMAGES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { PhnomPenhBranchMap } from '../components/maps/PhnomPenhBranchMap';
import type { BranchId } from '../types/store';

export function BranchesPage() {
  const { catalog, branches, navigateToShop, pushToast } = useStore();
  const [selectedBranchId, setSelectedBranchId] = useState<BranchId>('sonthormuk');

  // Team Order / Store Visit Inquiry Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('Team Kit Printing (5+ Jerseys)');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? branches[0];

  const stockedHere = catalog.filter(
    (p) => p.branchStock[selectedBranch.id] !== 'Out of Stock',
  );

  const stockCounts: Record<BranchId, number> = {
    sonthormuk: catalog.filter((p) => p.branchStock.sonthormuk !== 'Out of Stock').length,
    sensok: catalog.filter((p) => p.branchStock.sensok !== 'Out of Stock').length,
    chomkadong: catalog.filter((p) => p.branchStock.chomkadong !== 'Out of Stock').length,
  };

  const handleCopyContact = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    pushToast(`Copied ${label}: ${text}`);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.replace(/\D/g, '').length < 8) {
      setFormError('Please enter your name and a valid Cambodian phone number (+855).');
      return;
    }
    setFormError('');
    setSubmitted(true);
    pushToast(`Inquiry received by ${selectedBranch.name} team`);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      {/* Header */}
      <div className="border-b border-[#18222D]/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
          Phnom Penh Retail Network
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18222D]">
          Our 3 Phnom Penh Branches &amp; Heat-Press Labs
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#56616A]">
          Visit any Sport Castle store daily from 8:30 AM to 8:30 PM to test boot sizing in person, press custom football or F1 jerseys while you wait, or pick up your online order free of charge.
        </p>
      </div>

      {/* Interactive Google Maps Platform Store Locator */}
      <div className="mt-8">
        <PhnomPenhBranchMap
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          stockCounts={stockCounts}
        />
      </div>

      {/* Interactive Branch Cards */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {branches.map((branch) => {
          const active = branch.id === selectedBranchId;
          const count = stockCounts[branch.id];

          return (
            <div
              key={branch.id}
              className={`flex flex-col justify-between rounded-xl border p-6 transition-all ${
                active
                  ? 'border-[#18222D] bg-white shadow-md'
                  : 'border-[#18222D]/10 bg-[#F5F7F8] hover:bg-white'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#032EA1]">
                      {branch.shortName}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold text-[#18222D]">
                      {branch.name}
                    </h2>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#18222D]">
                    {count}/{catalog.length} SKUs
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-[#56616A]">
                  <p className="flex items-start gap-2 text-[#18222D]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#56616A]" />
                    <span>
                      {branch.address}, {branch.district}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{branch.hours}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Shirt className="h-3.5 w-3.5 shrink-0" />
                    <span>Custom Heat-Press: {branch.heatPressWait}</span>
                  </p>
                  <p className="flex items-center gap-2 font-mono text-[#18222D]">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#56616A]" />
                    <span>{branch.phone}</span>
                  </p>
                </div>

                <p className="mt-4 border-t border-[#18222D]/8 pt-3 text-xs font-medium text-[#18222D]">
                  {branch.highlight}
                </p>
                <p className="mt-1 text-[11px] text-[#56616A]">
                  Landmark: {branch.landmarks}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={`flex-1 h-10 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#18222D] text-white'
                      : 'border border-[#18222D]/20 bg-white text-[#18222D] hover:border-[#18222D]'
                  }`}
                >
                  {active ? 'Selected Branch' : 'Select Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => navigateToShop({ branch: branch.id })}
                  className="h-10 rounded-md border border-[#18222D]/20 bg-white px-3.5 text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer whitespace-nowrap"
                >
                  Shop Stock
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Branch Deep-Dive + Contact Form */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 overflow-hidden rounded-xl border border-[#18222D]/10 bg-white">
          <div className="relative h-56 sm:h-64 bg-[#0B0D10]">
            <img
              src={STUDIO_IMAGES.pitchEditorial}
              alt={`${selectedBranch.name} Phnom Penh neighborhood pitch hub`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10]/90 via-[#0B0D10]/30 to-transparent" />
            <div className="absolute bottom-5 left-6 right-6 text-white">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#D4AF37]">
                Active Branch Spotlight
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold">
                {selectedBranch.name}
              </h3>
              <p className="text-xs text-white/80">
                {selectedBranch.address}, {selectedBranch.district}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#F5F7F8] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#56616A]">
                  In-Store Inventory
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-[#18222D]">
                  {stockedHere.length} Items
                </p>
              </div>
              <div className="rounded-lg bg-[#F5F7F8] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#56616A]">
                  Jersey Press Time
                </p>
                <p className="mt-1 text-sm font-bold text-[#18222D]">
                  {selectedBranch.heatPressWait}
                </p>
              </div>
              <div className="rounded-lg bg-[#F5F7F8] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#56616A]">
                  Express Delivery
                </p>
                <p className="mt-1 text-sm font-bold text-[#032EA1]">
                  Same-Day Phnom Penh
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-[#18222D]/10 pt-4">
              <button
                type="button"
                onClick={() =>
                  handleCopyContact(selectedBranch.telegram, 'Telegram handle')
                }
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#18222D] px-4 text-xs font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Copy Telegram {selectedBranch.telegram}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCopyContact(selectedBranch.phone, 'Branch phone')
                }
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#18222D]/20 bg-white px-4 text-xs font-semibold text-[#18222D] hover:border-[#18222D] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy {selectedBranch.phone}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Direct Store / Team Order Inquiry Form */}
        <div className="lg:col-span-5 rounded-xl border border-[#18222D]/10 bg-white p-6">
          <h3 className="font-display text-xl font-bold text-[#18222D]">
            Message {selectedBranch.shortName} Staff
          </h3>
          <p className="mt-1 text-xs text-[#56616A]">
            Reserve a boot size for walk-in fitting, request a corporate tournament kit quote, or confirm F1 stock.
          </p>

          {submitted ? (
            <div className="mt-6 rounded-lg bg-[#F5F7F8] p-5 border border-[#18222D]/10">
              <div className="flex items-center gap-2 text-[#032EA1] font-semibold text-sm">
                <Check className="h-4 w-4" />
                <span>Request Sent to {selectedBranch.name}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#56616A]">
                Thank you, {name}. Our {selectedBranch.shortName} branch desk will message {phone} via Telegram or phone within 30 minutes during store hours (8:30 AM – 8:30 PM).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="mt-4 text-xs font-semibold text-[#18222D] underline cursor-pointer"
              >
                Send another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleInquirySubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="branch-contact-name"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                >
                  Your Full Name
                </label>
                <input
                  id="branch-contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sokha Meas"
                  className="mt-1 h-10 w-full rounded-md border border-[#18222D]/15 bg-[#F5F7F8] px-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="branch-contact-phone"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                >
                  Phone / Telegram (+855)
                </label>
                <input
                  id="branch-contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="mt-1 h-10 w-full rounded-md border border-[#18222D]/15 bg-[#F5F7F8] px-3 font-mono text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="branch-contact-topic"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                >
                  Inquiry Type
                </label>
                <select
                  id="branch-contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-[#18222D]/15 bg-[#F5F7F8] px-3 text-sm text-[#18222D]"
                >
                  <option>Team Kit Printing (5+ Jerseys)</option>
                  <option>Reserve Boot Size for Walk-In Fitting</option>
                  <option>F1 Motorsport Jersey Availability</option>
                  <option>Same-Day Phnom Penh Delivery Question</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="branch-contact-message"
                  className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                >
                  Details
                </label>
                <textarea
                  id="branch-contact-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Boot size, jersey count, or preferred pickup time..."
                  className="mt-1 w-full rounded-md border border-[#18222D]/15 bg-[#F5F7F8] p-3 text-sm text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-[#D81E2B]">{formError}</p>
              )}

              <button
                type="submit"
                className="h-11 w-full rounded-md bg-[#18222D] text-xs font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
              >
                Send Inquiry to {selectedBranch.shortName}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

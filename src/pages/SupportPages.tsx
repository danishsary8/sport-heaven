import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
} from 'lucide-react';
import { BRANCHES } from '../data/catalog';
import { FAQ_ITEMS } from '../data/editorial';
import { useStore } from '../context/StoreContext';
import type { FaqItem } from '../types/store';

const FAQ_CATEGORIES: Array<FaqItem['category'] | 'All'> = [
  'All',
  'Orders & Delivery',
  'Payments & KHQR',
  'Sizing & Surfaces',
  'Custom Print & Care',
  'Returns & Warranty',
];

export function FaqPage() {
  const { navigate } = useStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaqItem['category'] | 'All'>('All');
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (activeCategory !== 'All' && item.category !== activeCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
            KNOWLEDGE BASE · PHNOM PENH SUPPORT DESK
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
            Help Center &amp;{' '}
            <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
              FAQ Archive
            </span>
          </h1>
          <div className="relative mt-6 max-w-2xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#FDFCF9]/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shipping times, KHQR, TF vs AG turf studs, custom print care..."
              className="w-full border border-[#FDFCF9]/20 bg-[#FDFCF9]/10 py-3.5 pr-4 pl-11 text-sm text-[#FDFCF9] placeholder:text-[#FDFCF9]/45 outline-none focus:border-[#B8933B]"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#0E1113]/15 pb-5">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase transition ${
                activeCategory === cat
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75 hover:border-[#0E1113]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordions */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-8">
            {filtered.length === 0 ? (
              <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-8 text-center">
                <HelpCircle className="mx-auto h-7 w-7 text-[#0E1113]/40" />
                <p className="mt-3 font-display text-2xl font-bold uppercase">
                  No matching answers for “{query}”
                </p>
                <p className="mt-1 text-sm text-[#0E1113]/65">
                  Try clearing your keyword or reach our Phnom Penh specialists directly.
                </p>
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isOpen = openId === item.id;
                return (
                  <div
                    key={item.id}
                    className="border border-[#0E1113]/15 bg-[#FDFCF9]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? '' : item.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 font-mono text-[10px] text-[#B8933B]">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.16em] text-[#0E1113]/50 uppercase">
                            {item.category}
                          </p>
                          <h2 className="mt-0.5 text-sm font-bold text-[#0E1113] sm:text-base">
                            {item.question}
                          </h2>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[#0E1113]/60 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#0E1113]/10 bg-[#F4F2EC]/60 px-5 py-4 pl-12 text-sm leading-relaxed text-[#0E1113]/80">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Quick Actions */}
          <div className="space-y-4 lg:col-span-4">
            <div className="border border-[#0E1113]/15 bg-[#0E1113] p-6 text-[#FDFCF9]">
              <p className="font-mono text-[10px] tracking-[0.22em] text-[#B8933B] uppercase">
                STILL NEED HELP?
              </p>
              <h3 className="mt-2 font-display text-2xl font-extrabold uppercase">
                Talk to a Boot &amp; Kit Specialist
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#FDFCF9]/70">
                Average reply time under 15 minutes during Phnom Penh store hours (8:30 AM – 8:30 PM ICT).
              </p>
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate({ page: 'contact' })}
                  className="w-full bg-[#C8232C] px-4 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#FDFCF9] hover:text-[#0E1113]"
                >
                  Open Support Ticket / Live Chat
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'returns' })}
                  className="w-full border border-[#FDFCF9]/25 px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:border-[#FDFCF9]"
                >
                  Start Return / Size Exchange
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'orders' })}
                  className="w-full border border-[#FDFCF9]/25 px-4 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:border-[#FDFCF9]"
                >
                  Track an Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { orders, pushToast, navigate } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Sizing & Stud Recommendation');
  const [orderId, setOrderId] = useState(orders[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ from: 'desk' | 'user'; text: string }>>([
    {
      from: 'desk',
      text: 'Choum Reap Suor! You are connected with Sport Castle Sonthormuk Concierge. Ask about boot sizing, 2026/27 kit stock, or same-day Phnom Penh delivery.',
    },
  ]);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `TKT-SC-${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketId(id);
    pushToast(`Support ticket ${id} logged — SLA response < 2 hours`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    const reply = text.toLowerCase().includes('size')
      ? 'For Phnom Penh artificial turf, we recommend measuring your foot in CM and opening our interactive Fit Guide. Need half-size advice for Mercurial or Mizuno?'
      : text.toLowerCase().includes('print') || text.toLowerCase().includes('jersey')
        ? 'Heat-press custom printing takes 15–20 minutes at Sonthormuk & Sen Sok ($8 name/number + optional UCL/CPL patch).'
        : 'Got it! A Sonthormuk specialist has logged your note and can also confirm real-time branch stock via Telegram @SportCastleKH.';
    setChatLog((prev) => [
      ...prev,
      { from: 'user', text },
      { from: 'desk', text: reply },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
            DIRECT CONCIERGE · PHNOM PENH HEADQUARTERS
          </p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
                Contact{' '}
                <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                  Sport Castle
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#FDFCF9]/70">
                Order inquiries, corporate/CPL squad bulk kit quotes, custom heat-press requests, or boot warranty inspections — answered daily 8:30 AM – 8:30 PM ICT.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen((o) => !o)}
              className="inline-flex items-center gap-2 self-start bg-[#C8232C] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#FDFCF9] hover:text-[#0E1113]"
            >
              <MessageSquare className="h-4 w-4" />
              {chatOpen ? 'Hide Live Chat' : 'Launch Live Concierge Chat'}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        {chatOpen && (
          <div className="mb-8 border-2 border-[#0E1113] bg-[#FDFCF9]">
            <div className="flex items-center justify-between bg-[#0E1113] px-5 py-3 text-[#FDFCF9]">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.18em] uppercase">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                SPORT CASTLE LIVE CONCIERGE · ONLINE
              </div>
              <span className="font-mono text-[10px] text-[#FDFCF9]/60">
                AVG RESPONSE &lt; 2 MIN
              </span>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto p-5">
              {chatLog.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-lg px-4 py-2.5 text-xs leading-relaxed ${
                      m.from === 'user'
                        ? 'bg-[#0E1113] text-[#FDFCF9]'
                        : 'border border-[#0E1113]/15 bg-[#F4F2EC] text-[#0E1113]'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={handleSendChat}
              className="flex border-t border-[#0E1113]/15 bg-[#F4F2EC] p-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question (e.g. 'Size guide for Predator 25' or 'Jersey printing time')..."
                className="flex-1 bg-transparent px-3 text-sm text-[#0E1113] outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-[#0E1113] px-4 py-2 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
              >
                Send <Send className="h-3 w-3" />
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Ticket Form */}
          <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-8 lg:col-span-7">
            <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#0E1113] uppercase">
              SUBMIT SUPPORT TICKET
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold uppercase">
              Direct Desk Inquiry
            </h2>

            {ticketId ? (
              <div className="mt-6 border border-emerald-700/30 bg-emerald-50/70 p-6">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-800 uppercase">
                  <CheckCircle2 className="h-4 w-4" />
                  Ticket Logged — {ticketId}
                </div>
                <p className="mt-2 text-sm text-[#0E1113]/80">
                  Thank you, <strong>{fullName}</strong>. Our Sonthormuk customer desk will reply to{' '}
                  <strong>{email}</strong> within our 2-hour SLA window.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTicketId(null);
                    setMessage('');
                  }}
                  className="mt-4 bg-[#0E1113] px-4 py-2.5 font-mono text-[11px] font-bold text-[#FDFCF9] uppercase hover:bg-[#C8232C]"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/65 uppercase">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Sokha Chan"
                      className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm outline-none focus:border-[#0E1113]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/65 uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="player@phnompenh.kh"
                      className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm outline-none focus:border-[#0E1113]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/65 uppercase">
                      Department / Topic
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm outline-none focus:border-[#0E1113]"
                    >
                      <option>Sizing &amp; Stud Recommendation</option>
                      <option>Order Status &amp; Delivery</option>
                      <option>Team / Corporate Bulk Jersey Quote (10+ Kits)</option>
                      <option>Custom Heat-Press Inquiry</option>
                      <option>Return / Warranty Claim</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/65 uppercase">
                      Order Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. SC-8810"
                      className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 font-mono text-sm uppercase outline-none focus:border-[#0E1113]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-[0.16em] text-[#0E1113]/65 uppercase">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="Tell us your pitch surface, squad size, or order question..."
                    className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-3.5 py-2.5 text-sm outline-none focus:border-[#0E1113]"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-[#0E1113] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.18em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C]"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Support Ticket
                </button>
              </form>
            )}
          </div>

          {/* Right: SLA & Branches */}
          <div className="space-y-5 lg:col-span-5">
            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
                SERVICE LEVEL AGREEMENT (SLA)
              </p>
              <div className="mt-4 space-y-3 text-xs text-[#0E1113]/80">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[#0E1113]" />
                  <span>
                    <strong>Daily Hours:</strong> 8:30 AM – 8:30 PM ICT (7 Days)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-[#0E1113]" />
                  <span>
                    <strong>Hotline / Telegram:</strong> +855 23 884 910 · @SportCastleKH
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#0E1113]" />
                  <span>
                    <strong>Support Desk:</strong> support@sportcastle.com.kh (&lt; 2h reply)
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#0E1113] uppercase">
                  3 PHNOM PENH BRANCHES
                </p>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'branches' })}
                  className="font-mono text-[10px] font-bold text-[#C8232C] uppercase hover:underline"
                >
                  Full Store Locator →
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {BRANCHES.map((b) => (
                  <div
                    key={b.id}
                    className="border border-[#0E1113]/10 bg-[#F4F2EC] p-3.5 text-xs"
                  >
                    <p className="font-display text-base font-bold text-[#0E1113] uppercase">
                      {b.name}
                    </p>
                    <p className="mt-0.5 flex items-start gap-1.5 text-[#0E1113]/70">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C8232C]" />
                      {b.address}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[#0E1113]/55">
                      {b.hours} · {b.phone}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

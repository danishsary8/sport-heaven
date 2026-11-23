import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock,
  Copy,
  Flame,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ProductCard } from '../components/product';
import { BRANCHES, PRODUCTS, STUDIO_IMAGES } from '../data/catalog';
import {
  BLOG_ARTICLES,
  BLOG_BY_SLUG,
  CAMPAIGN_BY_SLUG,
  CAMPAIGN_LANDINGS,
} from '../data/editorial';
import { useStore } from '../context/StoreContext';

export function AboutPage() {
  const { navigate } = useStore();

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      {/* Split Editorial Masthead */}
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="font-mono text-[10px] tracking-[0.28em] text-[#B8933B] uppercase">
              FOUNDED IN PHNOM PENH · EST. 2016 · MONOGRAPH 01
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[0.88] font-extrabold uppercase sm:text-7xl">
              Cambodia’s{' '}
              <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                Matchday
              </span>{' '}
              Atelier
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#FDFCF9]/75 sm:text-base">
              Sport Castle was founded by Phnom Penh weekend strikers frustrated by counterfeit cleats and wrong-surface studs. Today we operate three dedicated football, futsal, and Formula 1 flagship studios — pairing 100% authentic global drops with on-site laser heat-press labs and pitch-tested stud advice.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate({ page: 'branches' })}
                className="inline-flex items-center gap-2 bg-[#C8232C] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#FDFCF9] hover:text-[#0E1113]"
              >
                Visit Our 3 Branches <MapPin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'shop', collectionSlug: 'all' })}
                className="border border-[#FDFCF9]/30 px-6 py-3.5 font-mono text-xs font-semibold tracking-[0.16em] text-[#FDFCF9] uppercase hover:border-[#FDFCF9]"
              >
                Explore 51-Item Archive
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative overflow-hidden border border-[#FDFCF9]/15 bg-[#161B1F]">
              <img
                src={STUDIO_IMAGES.pitchEditorial}
                alt="Phnom Penh night matchday pitch"
                className="aspect-[4/3] w-full object-cover opacity-90"
              />
              <div className="border-t border-[#FDFCF9]/15 px-4 py-3 font-mono text-[10px] tracking-[0.2em] text-[#FDFCF9]/65 uppercase">
                FIG. 01 — PHNOM PENH FLOODLIGHT TURF TESTING LAB
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="border-b border-[#0E1113]/15 bg-[#FDFCF9]">
        <div className="mx-auto grid max-w-[1380px] grid-cols-2 divide-x divide-y divide-[#0E1113]/15 px-4 sm:grid-cols-4 sm:divide-y-0 sm:px-6 lg:px-10">
          {[
            { num: '51+', label: 'Authentic SKUs In Stock' },
            { num: '3', label: 'Phnom Penh Flagship Studios' },
            { num: '15 MIN', label: 'Pro Heat-Press Turnaround' },
            { num: '100%', label: 'Authorized Retail Authenticity' },
          ].map((stat) => (
            <div key={stat.label} className="p-6 sm:p-8">
              <p className="font-display text-4xl font-extrabold text-[#0E1113] sm:text-5xl">
                {stat.num}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-[#0E1113]/60 uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Pillars & Craftsmanship */}
      <section className="mx-auto mt-14 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              num: 'PILLAR 01',
              title: 'Zero Counterfeits, Ever',
              body: 'Every Nike Air Zoom, Adidas Predator 25, Mizuno Made in Japan K-leather boot, and 2026/27 UEFA Champions League kit is sourced directly through verified regional brand distributors with serialized box tags.',
            },
            {
              icon: Award,
              num: 'PILLAR 02',
              title: 'Surface-First Boot Fitting',
              body: 'We fit boots for Cambodia’s real playing conditions — from Sen Sok’s 4G crumb turf and Toul Kork’s 7v7 leagues to Morodok Techo natural stadium grass and indoor futsal hardwood.',
            },
            {
              icon: Flame,
              num: 'PILLAR 03',
              title: 'In-House Press & F1 Paddock',
              body: 'Our Sonthormuk and Sen Sok studios house commercial matte-vinyl heat-presses for club namesets, CPL/UCL patches, and official 2026 Formula 1 Ferrari, Red Bull, and Mercedes teamwear.',
            },
          ].map((item) => (
            <div
              key={item.num}
              className="border border-[#0E1113]/15 bg-[#FDFCF9] p-7"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B]">
                  {item.num}
                </span>
                <item.icon className="h-5 w-5 text-[#0E1113]" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold text-[#0E1113] uppercase">
                {item.title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#0E1113]/75">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Phnom Penh Footprint */}
        <div className="mt-12 border border-[#0E1113]/15 bg-[#FDFCF9] p-8">
          <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#C8232C] uppercase">
            OMNICHANNEL RETAIL FOOTPRINT
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold uppercase sm:text-4xl">
            Three Phnom Penh Pitch Hubs
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {BRANCHES.map((branch) => (
              <div
                key={branch.id}
                className="border border-[#0E1113]/15 bg-[#F4F2EC] p-5"
              >
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#0E1113]/55 uppercase">
                  {branch.district}
                </p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#0E1113] uppercase">
                  {branch.name}
                </h3>
                <p className="mt-2 text-xs text-[#0E1113]/75">{branch.address}</p>
                <p className="mt-2 font-mono text-[11px] font-semibold text-[#C8232C]">
                  {branch.highlight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function BlogHubPage() {
  const { navigate } = useStore();
  const [activeCat, setActiveCat] = useState<string>('All');
  const categories = ['All', 'Buying Guide', 'Kit Culture', 'Boot Care', 'Matchday Lookbook'];

  const filtered =
    activeCat === 'All'
      ? BLOG_ARTICLES
      : BLOG_ARTICLES.filter((a) => a.category === activeCat);

  const lead = filtered[0];

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 lg:px-10">
          <p className="font-mono text-[10px] tracking-[0.28em] text-[#B8933B] uppercase">
            THE PITCH JOURNAL · EDITORIAL ARCHIVE
          </p>
          <h1 className="mt-3 font-display text-5xl leading-[0.9] font-extrabold uppercase sm:text-6xl">
            Matchday{' '}
            <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
              Journal &amp; Guides
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#FDFCF9]/70">
            Technical outsole comparisons for Phnom Penh turf, 2026/27 kit architecture breakdowns, Japanese K-leather maintenance rituals, and Formula 1 paddock styling.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 border-b border-[#0E1113]/15 pb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase transition ${
                activeCat === cat
                  ? 'bg-[#0E1113] text-[#FDFCF9]'
                  : 'border border-[#0E1113]/15 bg-[#FDFCF9] text-[#0E1113]/75 hover:border-[#0E1113]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Lead Story */}
        {lead && (
          <article
            onClick={() => navigate({ page: 'blog-post', slug: lead.slug })}
            className="mt-8 grid cursor-pointer grid-cols-1 border border-[#0E1113]/15 bg-[#FDFCF9] transition hover:border-[#0E1113] lg:grid-cols-12"
          >
            <div className="overflow-hidden bg-[#EAE7DF] lg:col-span-6">
              <img
                src={lead.heroImage}
                alt={lead.title}
                className="h-full min-h-[280px] w-full object-cover transition duration-500 hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-6">
              <div>
                <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase">
                  <span className="bg-[#C8232C] px-2.5 py-1 font-bold text-[#FDFCF9]">
                    {lead.category}
                  </span>
                  <span className="text-[#0E1113]/55">{lead.publishedAt}</span>
                  <span className="text-[#0E1113]/55">{lead.readMinutes} MIN READ</span>
                </div>
                <h2 className="mt-4 font-display text-3xl leading-[1] font-extrabold text-[#0E1113] uppercase sm:text-4xl">
                  {lead.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#0E1113]/75">
                  {lead.excerpt}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-[#0E1113]/15 pt-4">
                <span className="font-mono text-[11px] text-[#0E1113]/65">
                  By {lead.author}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-[#0E1113] uppercase">
                  Read Guide <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </article>
        )}

        {/* Remaining Articles Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {filtered.slice(1).map((article) => (
            <article
              key={article.slug}
              onClick={() => navigate({ page: 'blog-post', slug: article.slug })}
              className="flex cursor-pointer flex-col border border-[#0E1113]/15 bg-[#FDFCF9] transition hover:border-[#0E1113]"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#EAE7DF]">
                <img
                  src={article.heroImage}
                  alt={article.title}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em] text-[#0E1113]/55 uppercase">
                    <span className="font-bold text-[#C8232C]">{article.category}</span>
                    <span>{article.readMinutes} MIN</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl leading-[1.02] font-extrabold text-[#0E1113] uppercase">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#0E1113]/70">
                    {article.excerpt}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-[#0E1113]/10 pt-3 font-mono text-[10px] uppercase">
                  <span className="text-[#0E1113]/55">{article.publishedAt}</span>
                  <span className="font-bold text-[#0E1113]">Read →</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlogPostPage({ slug }: { slug: string }) {
  const { navigate, pushToast } = useStore();
  const article = BLOG_BY_SLUG.get(slug) ?? BLOG_ARTICLES[0];
  const [copied, setCopied] = useState(false);

  const shoppableProducts = article.featuredProductIds
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

  const handleShare = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
    } catch {}
    setCopied(true);
    pushToast('Article link copied to clipboard');
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      {/* Header */}
      <section className="border-b border-[#0E1113]/15 bg-[#FDFCF9]">
        <div className="mx-auto max-w-[1160px] px-4 py-10 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => navigate({ page: 'blog' })}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-[#0E1113]/70 uppercase hover:text-[#0E1113]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Pitch Journal
          </button>

          <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase">
            <span className="bg-[#0E1113] px-2.5 py-1 font-bold text-[#FDFCF9]">
              {article.category}
            </span>
            <span className="text-[#0E1113]/60">{article.publishedAt}</span>
            <span className="inline-flex items-center gap-1 text-[#0E1113]/60">
              <Clock className="h-3 w-3" /> {article.readMinutes} MIN READ
            </span>
          </div>

          <h1 className="mt-4 font-display text-4xl leading-[0.94] font-extrabold text-[#0E1113] uppercase sm:text-6xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#0E1113]/75">
            {article.excerpt}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#0E1113]/15 pt-5">
            <div>
              <p className="text-sm font-bold text-[#0E1113]">{article.author}</p>
              <p className="font-mono text-[10px] tracking-[0.14em] text-[#0E1113]/55 uppercase">
                {article.authorRole}
              </p>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-2 font-mono text-[11px] font-bold tracking-[0.14em] text-[#0E1113] uppercase hover:border-[#0E1113]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? 'Link Copied' : 'Share Article'}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-[1160px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Sticky TOC Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 border border-[#0E1113]/15 bg-[#FDFCF9] p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.2em] text-[#B8933B] uppercase">
                <BookOpen className="h-3.5 w-3.5" />
                TABLE OF CONTENTS
              </div>
              <nav className="mt-4 space-y-2.5">
                {article.sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="block text-xs leading-snug font-medium text-[#0E1113]/70 hover:text-[#C8232C]"
                  >
                    {sec.heading}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Long-Form Content */}
          <article className="space-y-8 lg:col-span-9">
            <div className="overflow-hidden border border-[#0E1113]/15 bg-[#EAE7DF]">
              <img
                src={article.heroImage}
                alt={article.title}
                className="max-h-[440px] w-full object-cover"
              />
            </div>

            <div className="space-y-8 border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-10">
              {article.sections.map((sec) => (
                <section key={sec.id} id={sec.id} className="scroll-mt-28">
                  <h2 className="font-display text-2xl font-extrabold text-[#0E1113] uppercase sm:text-3xl">
                    {sec.heading}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#0E1113]/80 sm:text-base">
                    {sec.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {sec.callout && (
                    <div className="mt-5 border-l-4 border-[#C8232C] bg-[#F4F2EC] p-4 font-mono text-xs leading-relaxed text-[#0E1113]">
                      {sec.callout}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* Embedded Shoppable Gear */}
            {shoppableProducts.length > 0 && (
              <div className="border border-[#0E1113]/15 bg-[#FDFCF9] p-6 sm:p-8">
                <p className="font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
                  FEATURED IN THIS GUIDE · SHOP THE EDIT
                </p>
                <h3 className="mt-1 font-display text-3xl font-extrabold uppercase">
                  Recommended Matchday Gear
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {shoppableProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

export function CampaignPage({ slug }: { slug: string }) {
  const { setPromoCode, navigate, pushToast } = useStore();
  const campaign = CAMPAIGN_BY_SLUG.get(slug) ?? CAMPAIGN_LANDINGS[0];
  const [applied, setApplied] = useState(false);

  const featuredProducts = campaign.featuredProductIds
    .map((id) => PRODUCTS.find((p) => p.id === id))
    .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

  const handleApplyPromo = () => {
    setPromoCode(campaign.promoCode);
    setApplied(true);
    pushToast(`Campaign code ${campaign.promoCode} locked into your bag`);
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] pb-20">
      <section className="border-b border-[#0E1113]/15 bg-[#0E1113] text-[#FDFCF9]">
        <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10">
          <div className="flex flex-col justify-center lg:col-span-7">
            <span className="inline-flex w-fit items-center gap-2 border border-[#B8933B]/40 bg-[#B8933B]/15 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.22em] text-[#B8933B] uppercase">
              <Sparkles className="h-3 w-3" />
              {campaign.badge}
            </span>
            <h1 className="mt-4 font-display text-5xl leading-[0.88] font-extrabold uppercase sm:text-7xl">
              {campaign.title}{' '}
              <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                {campaign.italicAccent}
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#FDFCF9]/75 sm:text-base">
              {campaign.subtitle}
            </p>

            {/* Promo Box */}
            <div className="mt-7 flex flex-wrap items-center gap-3 border border-[#FDFCF9]/20 bg-[#FDFCF9]/5 p-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#B8933B] uppercase">
                  {campaign.discountLabel}
                </p>
                <p className="font-mono text-lg font-bold tracking-[0.14em] text-[#FDFCF9]">
                  CODE: {campaign.promoCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyPromo}
                className="ml-auto inline-flex items-center gap-2 bg-[#C8232C] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase transition hover:bg-[#FDFCF9] hover:text-[#0E1113]"
              >
                {applied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {applied ? 'Applied to Cart' : 'Apply Promo Code'}
              </button>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-[#FDFCF9]/50 uppercase">
              {campaign.endsLabel}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-[#FDFCF9]/15 bg-[#EAE7DF] p-6">
              <img
                src={campaign.heroImage}
                alt={campaign.title}
                className="mx-auto aspect-square max-h-[340px] w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-[1380px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col justify-between gap-4 border-b border-[#0E1113]/15 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#C8232C] uppercase">
              CURATED CAMPAIGN EDIT
            </p>
            <h2 className="mt-1 font-display text-3xl font-extrabold uppercase sm:text-4xl">
              Featured Drop Silhouettes
            </h2>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-[#0E1113]/70">
            {campaign.editorialNote}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border border-[#0E1113]/15 bg-[#FDFCF9] p-6">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase">
              Explore All Seasonal Campaigns
            </p>
            <p className="text-xs text-[#0E1113]/65">
              Switch between our active Phnom Penh editorial drops.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_LANDINGS.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => navigate({ page: 'campaign', slug: c.slug })}
                className={`px-4 py-2.5 font-mono text-[11px] font-bold uppercase ${
                  c.slug === campaign.slug
                    ? 'bg-[#0E1113] text-[#FDFCF9]'
                    : 'border border-[#0E1113]/20 bg-[#F4F2EC] text-[#0E1113] hover:border-[#0E1113]'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ArrowRight, Check, Ruler } from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import {
  formatUsd,
  matchBootsForPlayer,
  recommendBootSizeFromCm,
  type BootFinderCriteria,
} from '../utils/commerce';
import { ProductCard } from '../components/product';

export function BootFinderPage() {
  const { navigateToShop, openSizeGuide } = useStore();
  const [criteria, setCriteria] = useState<BootFinderCriteria>({
    pitch: 'artificial-turf',
    playstyle: 'speed',
    maxBudget: 260,
  });
  const [footCm, setFootCm] = useState(26.5);

  const matches = matchBootsForPlayer(PRODUCTS, criteria);
  const sizeRec = recommendBootSizeFromCm(footCm);

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="border-b border-[#18222D]/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
          Phnom Penh Soleplate Advisory
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18222D]">
          Pitch Boot Finder &amp; Size Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#56616A]">
          Wearing FG bladed studs on hard Phnom Penh artificial turf increases ankle and knee strain. Select your pitch surface, playstyle, and budget to find the exact match-safe boots in stock.
        </p>
      </div>

      {/* 3-Step Interactive Selector */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Step 1: Pitch Surface */}
        <div className="rounded-xl border border-[#18222D]/10 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#56616A]">
            01. Where do you play most?
          </p>
          <div className="mt-4 space-y-2.5">
            {(
              [
                {
                  id: 'artificial-turf',
                  title: 'Phnom Penh 5v5 / 7v7 Turf (TF / AG)',
                  desc: 'Rubber-crumb artificial grass arenas (Sen Sok, Toul Kork, BKK)',
                },
                {
                  id: 'natural-grass',
                  title: 'Full Natural Grass (FG)',
                  desc: 'Stadium pitches, RSN / Olympic turf, provincial grass fields',
                },
                {
                  id: 'indoor-futsal',
                  title: 'Multi-Ground & All-Pitch Cleats (MG / FG-AG)',
                  desc: 'Versatile conical studded plates for switching between grass & 4G turf',
                },
              ] as const
            ).map((opt) => {
              const active = criteria.pitch === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, pitch: opt.id }))}
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#18222D] bg-[#F5F7F8]'
                      : 'border-[#18222D]/10 hover:border-[#18222D]/40'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-[#18222D]">{opt.title}</p>
                    <p className="mt-0.5 text-xs text-[#56616A]">{opt.desc}</p>
                  </div>
                  {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#032EA1]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Playstyle */}
        <div className="rounded-xl border border-[#18222D]/10 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#56616A]">
            02. Primary Playstyle
          </p>
          <div className="mt-4 space-y-2.5">
            {(
              [
                {
                  id: 'speed',
                  title: 'Explosive Speed & Wingers',
                  desc: 'Sub-195g lightweight knit uppers and snappy propulsion',
                },
                {
                  id: 'control',
                  title: 'Playmaker Control & Grip',
                  desc: 'Textured Gripknit strike zones and 360° pivot agility',
                },
                {
                  id: 'heritage',
                  title: 'Leather Touch & Comfort',
                  desc: 'Supple K-Leather, calfskin, or FlyTouch engineered leather',
                },
              ] as const
            ).map((opt) => {
              const active = criteria.playstyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setCriteria((prev) => ({ ...prev, playstyle: opt.id }))
                  }
                  className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#18222D] bg-[#F5F7F8]'
                      : 'border-[#18222D]/10 hover:border-[#18222D]/40'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-[#18222D]">{opt.title}</p>
                    <p className="mt-0.5 text-xs text-[#56616A]">{opt.desc}</p>
                  </div>
                  {active && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#032EA1]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Budget + Foot Length Converter */}
        <div className="flex flex-col justify-between rounded-xl border border-[#18222D]/10 bg-white p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="finder-budget"
                className="text-xs font-bold uppercase tracking-[0.12em] text-[#56616A]"
              >
                03. Maximum Budget
              </label>
              <span className="font-mono text-sm font-bold text-[#18222D]">
                {formatUsd(criteria.maxBudget)}
              </span>
            </div>
            <input
              id="finder-budget"
              type="range"
              min={90}
              max={280}
              step={10}
              value={criteria.maxBudget}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  maxBudget: Number(e.target.value),
                }))
              }
              className="mt-3 w-full accent-[#18222D]"
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-[#56616A]">
              <span>$90</span>
              <span>$180</span>
              <span>$280</span>
            </div>
          </div>

          <div className="rounded-lg bg-[#F5F7F8] p-4 border border-[#18222D]/8">
            <div className="flex items-center justify-between">
              <label
                htmlFor="finder-foot-cm"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18222D]"
              >
                <Ruler className="h-3.5 w-3.5" />
                <span>Quick Size Converter</span>
              </label>
              <span className="font-mono text-xs font-bold text-[#032EA1]">
                {footCm.toFixed(1)} cm
              </span>
            </div>
            <input
              id="finder-foot-cm"
              type="range"
              min={24}
              max={30}
              step={0.5}
              value={footCm}
              onChange={(e) => setFootCm(Number(e.target.value))}
              className="mt-2.5 w-full accent-[#18222D]"
            />
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-[#18222D]">
                EU {sizeRec.eu} · US {sizeRec.us} · UK {sizeRec.uk}
              </span>
              <button
                type="button"
                onClick={() => openSizeGuide('boots')}
                className="font-semibold text-[#032EA1] hover:underline cursor-pointer"
              >
                Full Chart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Matched Recommendations */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#56616A]">
              Recommended Matchday Rotation
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#18222D]">
              {matches.length} Boot{matches.length === 1 ? '' : 's'} Matched for Your Pitch
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigateToShop({ category: 'boots' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#18222D] hover:underline cursor-pointer"
          >
            <span>Compare All 8 Boots in Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-[#18222D]/10 bg-white p-10 text-center">
            <p className="font-display text-base font-bold text-[#18222D]">
              Raise your budget slider slightly to view Pro &amp; Elite soleplates for this surface.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {matches.map((boot) => (
              <ProductCard key={boot.id} product={boot} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

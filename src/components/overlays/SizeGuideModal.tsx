import { useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { BOOT_SIZE_CHART, JERSEY_SIZE_CHART } from '../../data/catalog';
import { useStore } from '../../context/StoreContext';
import { recommendBootSizeFromCm } from '../../utils/commerce';

export function SizeGuideModal() {
  const { isSizeGuideOpen, sizeGuideTab, openSizeGuide, closeSizeGuide } = useStore();
  const [footCm, setFootCm] = useState(26.5);

  if (!isSizeGuideOpen) return null;

  const rec = recommendBootSizeFromCm(footCm);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Boot and Jersey Size Guide"
    >
      <div
        className="fixed inset-0 bg-[#0B0D10]/55 backdrop-blur-[2px]"
        onClick={closeSizeGuide}
      />

      <div className="relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl border border-[#18222D]/10">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#18222D]/10 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Ruler className="h-5 w-5 text-[#18222D]" />
            <h2 className="font-display text-lg font-bold text-[#18222D]">
              Sport Castle Match-Fit Size Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={closeSizeGuide}
            aria-label="Close size guide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#56616A] hover:bg-[#F5F7F8] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Switcher */}
          <div className="inline-flex rounded-lg bg-[#F5F7F8] p-1 border border-[#18222D]/8">
            <button
              type="button"
              onClick={() => openSizeGuide('boots')}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                sizeGuideTab === 'boots'
                  ? 'bg-[#18222D] text-white'
                  : 'text-[#56616A] hover:text-[#18222D]'
              }`}
            >
              Football Boots &amp; Futsal
            </button>
            <button
              type="button"
              onClick={() => openSizeGuide('jerseys')}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                sizeGuideTab === 'jerseys'
                  ? 'bg-[#18222D] text-white'
                  : 'text-[#56616A] hover:text-[#18222D]'
              }`}
            >
              Football &amp; F1 Jerseys
            </button>
          </div>

          {sizeGuideTab === 'boots' ? (
            <div className="mt-5 space-y-6">
              {/* Interactive CM Foot Length Calculator */}
              <div className="rounded-lg bg-[#F5F7F8] p-4 border border-[#18222D]/8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="foot-cm-slider"
                    className="text-xs font-semibold uppercase tracking-[0.08em] text-[#18222D]"
                  >
                    Heel-to-Toe Foot Length (with match socks)
                  </label>
                  <span className="font-mono text-sm font-bold text-[#032EA1]">
                    {footCm.toFixed(1)} cm
                  </span>
                </div>
                <input
                  id="foot-cm-slider"
                  type="range"
                  min={24}
                  max={30}
                  step={0.5}
                  value={footCm}
                  onChange={(e) => setFootCm(Number(e.target.value))}
                  className="mt-3 w-full accent-[#18222D]"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#18222D]/10 pt-3">
                  <div className="flex items-center gap-4 font-mono text-sm">
                    <span>
                      EU <strong className="text-[#18222D]">{rec.eu}</strong>
                    </span>
                    <span className="text-[#56616A]">·</span>
                    <span>
                      US <strong className="text-[#18222D]">{rec.us}</strong>
                    </span>
                    <span className="text-[#56616A]">·</span>
                    <span>
                      UK <strong className="text-[#18222D]">{rec.uk}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-[#56616A]">{rec.fitNote}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#18222D]/15 text-[11px] uppercase tracking-[0.08em] text-[#56616A]">
                      <th className="py-2.5 pr-4">EU Size</th>
                      <th className="py-2.5 pr-4">US Men</th>
                      <th className="py-2.5 pr-4">UK</th>
                      <th className="py-2.5">Foot Length (CM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18222D]/8 font-mono text-xs tabular-nums">
                    {BOOT_SIZE_CHART.map((row) => {
                      const highlighted = row.eu === rec.eu;
                      return (
                        <tr
                          key={row.eu}
                          className={highlighted ? 'bg-[#032EA1]/8 font-semibold text-[#18222D]' : ''}
                        >
                          <td className="py-2.5 pr-4">EU {row.eu}</td>
                          <td className="py-2.5 pr-4">US {row.us}</td>
                          <td className="py-2.5 pr-4">UK {row.uk}</td>
                          <td className="py-2.5">{row.cm} cm</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <p className="text-sm text-[#56616A]">
                Authentic Player-Issue jerseys (Nike Dri-FIT ADV, Adidas HEAT.RDY) and F1 Paddock tops have an athletic tapered cut. If you prefer a looser casual fit, select one size up.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#18222D]/15 text-[11px] uppercase tracking-[0.08em] text-[#56616A]">
                      <th className="py-2.5 pr-4">Size</th>
                      <th className="py-2.5 pr-4">Chest (CM)</th>
                      <th className="py-2.5 pr-4">Length (CM)</th>
                      <th className="py-2.5">Recommended Height</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18222D]/8 font-mono text-xs tabular-nums">
                    {JERSEY_SIZE_CHART.map((row) => (
                      <tr key={row.size}>
                        <td className="py-2.5 pr-4 font-bold text-[#18222D]">{row.size}</td>
                        <td className="py-2.5 pr-4">{row.chestCm} cm</td>
                        <td className="py-2.5 pr-4">{row.lengthCm} cm</td>
                        <td className="py-2.5">{row.heightCm} cm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

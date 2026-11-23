import { ArrowRight } from 'lucide-react';
import { MEGA_MENU_DATA } from '../../data/lookbooks';
import { useStore } from '../../context/StoreContext';

export type MegaMenuKey = 'boots' | 'jerseys' | 'brands';

interface MegaMenuPanelProps {
  activeKey: MegaMenuKey;
  onClose: () => void;
}

export function MegaMenuPanel({ activeKey, onClose }: MegaMenuPanelProps) {
  const { navigate, navigateToShop } = useStore();
  const data = MEGA_MENU_DATA[activeKey];

  return (
    <div
      role="region"
      aria-label={`${data.heading} menu`}
      className="animate-mega-menu absolute inset-x-0 top-full z-40 border-b border-[#0E1113]/12 bg-[#FDFCF9] shadow-[0_20px_44px_rgba(14,17,19,0.08)]"
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left 8 Columns: 2 Structured Visual Thumbnail Lists */}
          <div className="col-span-8">
            <div className="mb-5 flex items-baseline justify-between border-b border-[#0E1113]/10 pb-3">
              <div>
                <h3 className="font-display text-base font-bold uppercase tracking-[0.02em] text-[#0E1113]">
                  {data.heading}
                </h3>
                <p className="mt-0.5 text-xs text-[#5A5D57]">{data.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigateToShop({
                    category:
                      activeKey === 'boots'
                        ? 'boots'
                        : activeKey === 'jerseys'
                          ? 'jerseys'
                          : 'all',
                  });
                }}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0E1113] hover:text-[#C8232C] transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {data.columns.map((col) => (
                <div key={col.title}>
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5A5D57]">
                    {col.title}
                  </p>
                  <ul className="space-y-1.5">
                    {col.items.map((item) => (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigateToShop(item.preset);
                          }}
                          className="group flex w-full items-center gap-3 p-1.5 text-left transition-colors hover:bg-[#F4F2EC] cursor-pointer"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden border border-[#0E1113]/10 bg-[#EAE7DF]">
                            <img
                              src={item.image}
                              alt={item.label}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#0E1113] group-hover:text-[#C8232C] transition-colors">
                              {item.label}
                            </span>
                            <span className="block truncate text-[11.5px] text-[#5A5D57]">
                              {item.sublabel}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Right 4 Columns: Editorial Feature Spotlight Card */}
          <div className="col-span-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate({ page: 'product', slug: data.featuredCard.slug }, data.featuredCard.slug);
              }}
              className="group block w-full overflow-hidden border border-[#0E1113]/12 bg-[#F4F2EC] text-left transition-colors duration-200 hover:border-[#0E1113]/45 cursor-pointer"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-[#EAE7DF]">
                <img
                  src={data.featuredCard.image}
                  alt={data.featuredCard.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A5D57]">
                  {data.featuredCard.eyebrow}
                </p>
                <p className="mt-1 font-display text-base font-bold text-[#0E1113]">
                  {data.featuredCard.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#5A5D57]">
                  {data.featuredCard.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0E1113] group-hover:text-[#C8232C]">
                  <span>{data.featuredCard.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

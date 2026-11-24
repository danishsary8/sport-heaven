import { useId, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { Product } from '../../types/store';
import {
  CATEGORY_FILTERS,
  DEFAULT_OPEN_FACETS,
  FACETS,
  FLAGS,
  getFacetOptions,
  getFlagCount,
  toggleFacetValue,
  toggleFlag,
  type FacetKey,
  type FacetOption,
  type ShopQuery,
} from '../../lib/shop-filters';

interface FilterPanelProps {
  products: Product[];
  query: ShopQuery;
  onChange: (next: ShopQuery) => void;
}

/** Long option lists collapse to this many rows until "Show all" is pressed. */
const COLLAPSED_OPTION_LIMIT = 6;

/**
 * Filter groups for the current category. Used inside the desktop sidebar
 * and the mobile bottom sheet, so both always show the same options.
 */
export function FilterPanel({ products, query, onChange }: FilterPanelProps) {
  const config = CATEGORY_FILTERS[query.category];

  return (
    <div className="divide-y divide-[#1B1E1B]/10">
      {config.facets.map((key) => (
        <FacetGroup
          key={`${query.category}-${key}`}
          facetKey={key}
          options={getFacetOptions(products, query, key)}
          onToggle={(value) => onChange(toggleFacetValue(query, key, value))}
        />
      ))}

      {config.flags.length > 0 && (
        <fieldset className="py-4">
          <legend className="mb-2 text-sm font-semibold text-[#1B1E1B]">More options</legend>
          <ul className="space-y-0.5">
            {config.flags.map((flag) => {
              const checked = query.flags.includes(flag);
              const count = getFlagCount(products, query, flag);
              return (
                <li key={flag}>
                  <OptionRow
                    label={FLAGS[flag].label}
                    count={count}
                    checked={checked}
                    disabled={!checked && count === 0}
                    onToggle={() => onChange(toggleFlag(query, flag))}
                  />
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </div>
  );
}

function FacetGroup({
  facetKey,
  options,
  onToggle,
}: {
  facetKey: FacetKey;
  options: FacetOption[];
  onToggle: (value: string) => void;
}) {
  const def = FACETS[facetKey];
  const selectedCount = options.filter((o) => o.selected).length;
  const [open, setOpen] = useState(DEFAULT_OPEN_FACETS.includes(facetKey) || selectedCount > 0);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const panelId = useId();

  // A facet with a single option and nothing selected adds no choice: hide it.
  if (options.length <= 1 && selectedCount === 0) return null;

  const needle = search.trim().toLowerCase();
  const filtered = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const visible = showAll || needle ? filtered : filtered.slice(0, COLLAPSED_OPTION_LIMIT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <section className="py-1">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-semibold text-[#1B1E1B] cursor-pointer"
        >
          <span>
            {def.label}
            {selectedCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#A37B5C] px-1.5 text-[11px] font-semibold text-white tabular-nums">
                {selectedCount}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 text-[#5E625B] transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>

      {open && (
        <div id={panelId} className="pb-3">
          {def.searchable && options.length > COLLAPSED_OPTION_LIMIT && (
            <label className="relative mb-2 block">
              <span className="sr-only">Search {def.label.toLowerCase()}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E625B]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Find a ${def.label.toLowerCase()}`}
                className="h-11 w-full rounded-lg border border-[#1B1E1B]/15 bg-white pl-9 pr-3 text-sm text-[#1B1E1B] placeholder:text-[#5E625B]/80 focus:border-[#A37B5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A37B5C]/40"
              />
            </label>
          )}

          <ul className="space-y-0.5">
            {visible.map((option) => (
              <li key={option.value}>
                <OptionRow
                  label={option.label}
                  count={option.count}
                  checked={option.selected}
                  disabled={!option.selected && option.count === 0}
                  onToggle={() => onToggle(option.value)}
                />
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-2 text-sm text-[#5E625B]">No {def.label.toLowerCase()} matches “{search}”.</li>
            )}
          </ul>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-1 min-h-11 text-sm font-medium text-[#1B1E1B] underline decoration-[#A37B5C] decoration-2 underline-offset-4 hover:text-[#A37B5C] cursor-pointer"
            >
              Show all {filtered.length}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function OptionRow({
  label,
  count,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`group flex min-h-11 items-center gap-3 rounded-lg px-2 -mx-2 text-sm ${
        disabled ? 'cursor-not-allowed text-[#1B1E1B]/35' : 'cursor-pointer text-[#1B1E1B] hover:bg-[#1B1E1B]/[0.04]'
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#A37B5C] peer-focus-visible:ring-offset-2 ${
          checked ? 'border-[#1B1E1B] bg-[#1B1E1B] text-white' : 'border-[#1B1E1B]/30 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
      </span>
      <span className="flex-1 leading-snug">{label}</span>
      <span className="tabular-nums text-xs text-[#5E625B]">{count}</span>
    </label>
  );
}

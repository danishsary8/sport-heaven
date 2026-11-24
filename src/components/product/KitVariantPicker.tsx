import type { KitVariant, Product } from '../../types/store';
import { PLAYER_VERSION_PREMIUM } from '../../lib/product-attributes';
import { formatUsd } from '../../utils/commerce';

interface KitVariantPickerProps {
  product: Product;
  value: KitVariant;
  onChange: (next: KitVariant) => void;
}

const VERSION_HINT: Record<string, string> = {
  Fan: 'Relaxed fit, embroidered crest',
  Player: 'Slim match fit, lighter fabric',
};

/**
 * Version / fit / sleeve choice for a kit. Groups with a single option are
 * shown as plain text so the shopper still sees what they are buying.
 */
export function KitVariantPicker({ product, value, onChange }: KitVariantPickerProps) {
  const groups: Array<{
    key: keyof KitVariant;
    label: string;
    options: string[];
    describe?: (option: string) => string | undefined;
  }> = [
    {
      key: 'version',
      label: 'Version',
      options: product.versions ?? ['Fan'],
      describe: (o) => (o === 'Player' ? `+${formatUsd(PLAYER_VERSION_PREMIUM)}` : undefined),
    },
    { key: 'fit', label: 'Fit', options: product.fits ?? ['Men'] },
    {
      key: 'sleeve',
      label: 'Sleeve',
      options: product.sleeves ?? ['Short'],
      describe: undefined,
    },
  ];

  return (
    <div className="mt-5 space-y-4">
      {groups.map((group) => {
        const name = `${product.id}-${group.key}`;
        if (group.options.length === 1) {
          return (
            <p key={group.key} className="text-xs text-[#5F625C]">
              <span className="font-semibold text-[#0E1113]">{group.label}:</span>{' '}
              {group.key === 'sleeve' ? `${group.options[0]} sleeve` : group.options[0]} only
            </p>
          );
        }
        return (
          <fieldset key={group.key}>
            <legend className="text-xs font-semibold text-[#0E1113]">
              {group.label}
              {group.key === 'version' && (
                <span className="ml-2 font-normal text-[#5F625C]">{VERSION_HINT[value.version]}</span>
              )}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.options.map((option) => {
                const checked = value[group.key] === option;
                const note = group.describe?.(option);
                return (
                  <label key={option} className="relative">
                    <input
                      type="radio"
                      name={name}
                      value={option}
                      checked={checked}
                      onChange={() => onChange({ ...value, [group.key]: option } as KitVariant)}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-11 cursor-pointer items-center gap-1.5 border px-4 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#A37B5C] peer-focus-visible:ring-offset-2 ${
                        checked
                          ? 'border-[#0E1113] bg-[#0E1113] text-white'
                          : 'border-[#0E1113]/20 bg-white text-[#0E1113] hover:border-[#0E1113]'
                      }`}
                    >
                      {group.key === 'sleeve' ? `${option} sleeve` : option}
                      {note && <span className={checked ? 'text-white/75' : 'text-[#5F625C]'}>{note}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

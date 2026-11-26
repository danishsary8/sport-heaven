import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { apiFetch, type ResponseOf } from '../../../lib/api';
import { formatUsd, useI18n } from '../../../lib/i18n';
import { Field, Select, cx } from '../../../ui';
import { JerseyPreviewSvg } from './JerseyPreview';
import type { JerseyFontStyle, JerseyPatchId } from './types';

export type PrintOptions = ResponseOf<'/v1/catalog/print-options', 'get'>;

export interface PrintChoice {
  name: string;
  number: number;
  patch: JerseyPatchId;
  font: JerseyFontStyle;
}

/** What the shopper typed, kept as text so half-typed values stay on screen. */
export interface PrintState {
  on: boolean;
  name: string;
  number: string;
  patch: JerseyPatchId;
  font: JerseyFontStyle;
}

export const EMPTY_PRINT: PrintState = { on: false, name: '', number: '', patch: 'none', font: 'pro-condensed' };

const NAME_RE = /^[A-Z .'-]+$/;

export function printErrors(s: PrintState, max = 14, min = 1, maxNum = 99): { name?: 'nameRequired' | 'nameLong' | 'nameChars'; number?: 'number' } {
  const name = s.name.trim();
  const n = Number(s.number);
  return {
    name: !name ? 'nameRequired' : name.length > max ? 'nameLong' : !NAME_RE.test(name) ? 'nameChars' : undefined,
    number: !/^\d+$/.test(s.number) || n < min || n > maxNum ? 'number' : undefined,
  };
}

/** The print to send with Add to bag: null when printing is off; 'invalid' while the fields are wrong. */
export function printChoice(s: PrintState): PrintChoice | null | 'invalid' {
  if (!s.on) return null;
  const e = printErrors(s);
  if (e.name || e.number) return 'invalid';
  return { name: s.name.trim(), number: Number(s.number), patch: s.patch, font: s.font };
}

export function usePrintOptions(enabled = true) {
  return useQuery({
    queryKey: ['catalog', 'print-options'],
    queryFn: ({ signal }) => apiFetch<PrintOptions>('/v1/catalog/print-options', { signal }),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** Name and number printing: the letters "press" onto the shirt preview as you type. Fees come from the API. */
export function PrintStudio({ value, onChange, swatch }: { value: PrintState; onChange(v: PrintState): void; swatch?: string | null }) {
  const { t } = useI18n();
  const options = usePrintOptions();
  const o = options.data;
  const errors = printErrors(value, o?.nameMaxLength, o?.numberMin, o?.numberMax);
  const touchedName = value.name.length > 0;
  const touchedNumber = value.number.length > 0;
  const set = (patch: Partial<PrintState>) => onChange({ ...value, ...patch });
  const fee = o?.patches.find((p) => p.id === value.patch)?.feeCents ?? 0;
  // `/p/:slug#print` opens the studio: the product loads after the browser's own hash jump, so scroll here.
  const { hash } = useLocation();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (hash === '#print') ref.current?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <section ref={ref} id="print" aria-labelledby="print-heading" className="mt-6 scroll-mt-20 rounded-[8px] border border-stone">
      <h2 id="print-heading" className="sr-only">
        {t('print.title')}
      </h2>
      <label className="flex cursor-pointer items-center gap-3 p-4">
        <input type="checkbox" className="size-5 accent-obsidian" checked={value.on} onChange={(e) => set({ on: e.target.checked })} />
        <span className="flex-1">
          <span className="block font-semibold">{t('print.toggle')}</span>
          {o && <span className="block text-sm text-graphite">{t('print.cost', { price: formatUsd(o.baseCents) })}</span>}
        </span>
      </label>
      {value.on && (
        <div className="grid gap-5 border-t border-stone p-4 sm:grid-cols-[1fr_180px]">
          <div className="flex flex-col gap-3">
            <Field
              label={t('print.name')}
              value={value.name}
              onChange={(e) => set({ name: e.target.value.toUpperCase() })}
              maxLength={(o?.nameMaxLength ?? 14) + 2}
              autoCapitalize="characters"
              autoComplete="off"
              error={touchedName && errors.name ? t(`print.err.${errors.name}`, { n: o?.nameMaxLength ?? 14 }) : null}
              hint={t('print.nameHint', { n: o?.nameMaxLength ?? 14 })}
            />
            <Field
              label={t('print.number')}
              value={value.number}
              onChange={(e) => set({ number: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
              inputMode="numeric"
              autoComplete="off"
              error={touchedNumber && errors.number ? t('print.err.number', { min: o?.numberMin ?? 1, max: o?.numberMax ?? 99 }) : null}
            />
            <Select label={t('print.patch')} value={value.patch} onChange={(e) => set({ patch: e.target.value as JerseyPatchId })} hint={fee ? t('print.patchFee', { price: formatUsd(fee) }) : undefined}>
              {(o?.patches ?? [{ id: 'none', label: 'No patch', feeCents: 0 }]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.feeCents ? `${p.label} (+${formatUsd(p.feeCents)})` : p.label}
                </option>
              ))}
            </Select>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">{t('print.font')}</legend>
              <div className="flex flex-wrap gap-2">
                {(o?.fonts ?? []).map((f) => (
                  <label
                    key={f.id}
                    className={cx(
                      'cursor-pointer rounded-[6px] border px-3 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-obsidian',
                      value.font === f.id ? 'border-obsidian bg-obsidian text-paper' : 'border-[#C9C5BB]',
                    )}
                  >
                    <input type="radio" name="print-font" className="sr-only" checked={value.font === f.id} onChange={() => set({ font: f.id as JerseyFontStyle })} />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-graphite">{t('print.note')}</p>
          </div>
          <div className="print-press order-first mx-auto w-[150px] sm:order-none sm:w-[180px]" key={`${value.name}|${value.number}`}>
            <JerseyPreviewSvg
              theme={{ primary: swatch ?? '#0A338F', secondary: '#0E1113', trim: '#C8232C', text: '#FFFFFF', pattern: 'solid', crestLabel: 'SPORT CASTLE' }}
              playerName={value.name.trim()}
              squadNumber={value.number}
              patch={value.patch}
              fontStyle={value.font}
            />
          </div>
        </div>
      )}
    </section>
  );
}

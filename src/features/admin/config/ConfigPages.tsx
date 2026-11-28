import { useState, type FormEvent, type ReactNode } from 'react';
import { isApiError } from '../../../lib/api';
import { formatUsd } from '../../../lib/i18n';
import { Button, ErrorState, Field, QueryView, Select, Skeleton, cx, useToast } from '../../../ui';
import { AdminOnly } from '../AdminLayout';
import { patch, post, put, useAdminMutation, useAdminQuery } from '../api';
import { toCents } from '../products/ProductsPages';
import type { Promotion, ShippingRate } from '../types';
import { AdminPage, Pill, human } from '../ui';

const dollars = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2));
const errText = (e: unknown) => (isApiError(e) ? e.message : 'Something went wrong.');

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[8px] border border-stone p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** The queries live inside the admin gate, so staff never send them. */
export function PromotionsPage() {
  return (
    <AdminOnly>
      <PromotionsPageBody />
    </AdminOnly>
  );
}

function PromotionsPageBody() {
  const toast = useToast();
  const list = useAdminQuery<{ promotions: Promotion[] }>(['promotions'], '/v1/admin/promotions');
  const toggle = useAdminMutation(({ id, active }: { id: string; active: boolean }) => patch(`/v1/admin/promotions/${id}`, { active }), [['promotions']]);
  const create = useAdminMutation((body: unknown) => post('/v1/admin/promotions', body), [['promotions']]);
  const [f, setF] = useState({ code: '', name: '', type: 'percent' as Promotion['type'], value: '', min: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = f.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setError('Use 3 to 30 letters, numbers, _ or - for the code.');
    if (!f.name.trim()) return setError('Give the code a name staff will recognise.');
    let value = 0;
    if (f.type === 'percent') {
      value = Number(f.value);
      if (!Number.isInteger(value) || value < 1 || value > 100) return setError('Enter a percentage from 1 to 100.');
    } else if (f.type === 'fixed') {
      const c = toCents(f.value);
      if (!c) return setError('Enter the amount off like 5 or 5.50.');
      value = c;
    }
    const min = f.min.trim() ? toCents(f.min) : 0;
    if (min === null) return setError('Enter the minimum spend like 50, or leave it empty.');
    setError(null);
    create.mutate(
      { code, name: f.name.trim(), type: f.type, value, minSubtotalCents: min, active: true },
      { onSuccess: () => (toast.success(`Code ${code} created`), setF({ code: '', name: '', type: 'percent', value: '', min: '' })), onError: (er) => setError(errText(er)) },
    );
  };

  return (
    <>
      <AdminPage title="Promotions">
        <QueryView query={list} skeleton={<Skeleton className="h-40 w-full" />}>
          {(d) => (
            <ul className="divide-y divide-stone rounded-[8px] border border-stone">
              {d.promotions.map((p) => (
                <li key={p.id} aria-label={`${p.code} ${p.name}`} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <span>
                    <span className="font-mono font-semibold">{p.code}</span> <span>{p.name}</span>
                    <span className="block text-sm text-graphite">
                      {p.type === 'percent' ? `${p.value}% off` : p.type === 'fixed' ? `${formatUsd(p.value)} off` : 'Free delivery'}
                      {p.minSubtotalCents ? `, from ${formatUsd(p.minSubtotalCents)}` : ''}, used {p.usedCount}
                      {p.maxUses ? ` of ${p.maxUses}` : ''} times
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Pill tone={p.active ? 'good' : 'neutral'}>{p.active ? 'On' : 'Off'}</Pill>
                    <Button size="sm" variant="secondary" aria-label={`${p.active ? 'Turn off' : 'Turn on'} ${p.code}`} onClick={() => toggle.mutate({ id: p.id, active: !p.active }, { onError: (e) => toast.error(errText(e)) })}>
                      {p.active ? 'Turn off' : 'Turn on'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
        <Card title="New promo code">
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoCapitalize="characters" />
            <Field label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Promotion['type'] })}>
              <option value="percent">Percent off</option>
              <option value="fixed">Amount off</option>
              <option value="free_shipping">Free delivery</option>
            </Select>
            {f.type !== 'free_shipping' && (
              <Field label={f.type === 'percent' ? 'Percent off' : 'Amount off (USD)'} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} inputMode="decimal" />
            )}
            <Field label="Minimum spend (USD, optional)" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} inputMode="decimal" />
            {error && <ErrorState message={error} className="sm:col-span-2 lg:col-span-3" />}
            <Button type="submit" variant="primary" loading={create.isPending} className="sm:col-span-2 sm:justify-self-start lg:col-span-3">
              Create code
            </Button>
          </form>
        </Card>
      </AdminPage>
    </>
  );
}

const METHOD_NAME: Record<string, string> = { pp_rider: 'Phnom Penh rider', province_courier: 'Province courier', pickup: 'Store pickup' };

/** The queries live inside the admin gate, so staff never send them. */
export function DeliveryPage() {
  return (
    <AdminOnly>
      <DeliveryPageBody />
    </AdminOnly>
  );
}

function DeliveryPageBody() {
  const rates = useAdminQuery<{ rates: ShippingRate[] }>(['rates'], '/v1/admin/shipping-rates');
  return (
    <>
      <AdminPage title="Delivery">
        <p className="text-graphite">Fees customers pay at checkout. Remember to update the delivery help page when they change.</p>
        <QueryView query={rates} skeleton={<Skeleton className="h-40 w-full" />}>
          {(d) => (
            <ul className="divide-y divide-stone rounded-[8px] border border-stone">
              {d.rates.map((r) => (
                <RateRow key={r.id} rate={r} />
              ))}
            </ul>
          )}
        </QueryView>
      </AdminPage>
    </>
  );
}

function RateRow({ rate }: { rate: ShippingRate }) {
  const toast = useToast();
  const [fee, setFee] = useState(dollars(rate.feeCents));
  const [free, setFree] = useState(dollars(rate.freeOverCents));
  const [eta, setEta] = useState(rate.etaI18n.en ?? '');
  const save = useAdminMutation((body: unknown) => put(`/v1/admin/shipping-rates/${rate.id}`, body), [['rates']]);
  const name = METHOD_NAME[rate.methodId] ?? human(rate.methodId);
  return (
    <li aria-label={name} className="flex flex-wrap items-end gap-3 p-3">
      <span className="min-w-[160px]">
        <span className="block font-semibold">{name}</span>
        {rate.needsReview && <Pill tone="warn">Placeholder, check it</Pill>}
      </span>
      <Field label="Fee (USD)" value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" className="w-28" />
      <Field label="Free from (USD)" value={free} onChange={(e) => setFree(e.target.value)} inputMode="decimal" className="w-32" />
      <Field label="Time (English)" value={eta} onChange={(e) => setEta(e.target.value)} className="w-44" />
      <Button
        size="sm"
        variant="secondary"
        className="mb-1"
        loading={save.isPending}
        onClick={() => {
          const feeCents = toCents(fee);
          const freeOverCents = free.trim() ? toCents(free) : null;
          if (feeCents === null || (free.trim() && freeOverCents === null)) return toast.error('Enter amounts like 2.50');
          save.mutate({ feeCents, freeOverCents, ...(eta.trim() ? { etaEn: eta.trim() } : {}) }, { onSuccess: () => toast.success(`${name} saved`), onError: (e) => toast.error(errText(e)) });
        }}
      >
        Save
      </Button>
    </li>
  );
}

interface Settings {
  payment_methods_enabled: Record<string, boolean>;
  reservation_minutes: { minutes: number };
  cash_on_pickup_hours: { hours: number };
  online_safety_buffer: { units: number };
  return_rules: { exchangeDays: number; refundDays: number; nonReturnable: string[] };
  price_rounding?: { endInNinety: boolean };
}
const PAY: [string, string][] = [
  ['aba_khqr', 'ABA KHQR'],
  ['card', 'Card'],
  ['acleda', 'ACLEDA'],
  ['wing', 'Wing'],
  ['cash_on_pickup', 'Cash on pickup'],
];

/** The queries live inside the admin gate, so staff never send them. */
export function SettingsPage() {
  return (
    <AdminOnly>
      <SettingsPageBody />
    </AdminOnly>
  );
}

function SettingsPageBody() {
  const settings = useAdminQuery<{ settings: Settings }>(['settings'], '/v1/admin/settings');
  const pricing = useAdminQuery<{ settings: { khr_rate?: { rate: number } } }>(['settings', 'pricing'], '/v1/admin/settings/pricing');
  return (
    <>
      <AdminPage title="Settings">
        <QueryView query={settings} skeleton={<Skeleton className="h-64 w-full" />}>
          {(d) => <OperationalSettings s={d.settings} />}
        </QueryView>
        {pricing.data && <RateCard rate={pricing.data.settings.khr_rate?.rate ?? 4100} />}
      </AdminPage>
    </>
  );
}

function useSetting(path: string) {
  const toast = useToast();
  const m = useAdminMutation((body: unknown) => put(path, body), [['settings']]);
  return (body: unknown, done: string) => m.mutate(body, { onSuccess: () => toast.success(done), onError: (e) => toast.error(errText(e)) });
}

function OperationalSettings({ s }: { s: Settings }) {
  const [pay, setPay] = useState(s.payment_methods_enabled);
  const [hold, setHold] = useState(String(s.reservation_minutes.minutes));
  const [cashHours, setCashHours] = useState(String(s.cash_on_pickup_hours.hours));
  const [buffer, setBuffer] = useState(String(s.online_safety_buffer.units));
  const [exchange, setExchange] = useState(String(s.return_rules.exchangeDays));
  const [refund, setRefund] = useState(String(s.return_rules.refundDays));
  const savePay = useSetting('/v1/admin/settings/payment_methods_enabled');
  const saveHold = useSetting('/v1/admin/settings/reservation_minutes');
  const saveCash = useSetting('/v1/admin/settings/cash_on_pickup_hours');
  const saveBuffer = useSetting('/v1/admin/settings/online_safety_buffer');
  const saveReturns = useSetting('/v1/admin/settings/return_rules');
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PriceRuleCard on={s.price_rounding?.endInNinety !== false} />
      <Card title="Payment methods">
        <div className="flex flex-col gap-2">
          {PAY.map(([id, label]) => (
            <label key={id} className="flex items-center gap-3">
              <input type="checkbox" className="size-5 accent-obsidian" checked={!!pay[id]} onChange={(e) => setPay({ ...pay, [id]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-graphite">KHQR, card, ACLEDA and Wing need a PayWay account. Without one only cash on pickup works.</p>
        <Button className="mt-3" variant="secondary" onClick={() => savePay(pay, 'Payment methods saved')}>
          Save payment methods
        </Button>
      </Card>
      <Card title="Holding stock">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hold items while paying (minutes)" value={hold} onChange={(e) => setHold(e.target.value)} inputMode="numeric" hint="10 to 120." />
          <Button className="self-end sm:mb-7" variant="secondary" onClick={() => saveHold({ minutes: Number(hold) }, 'Hold time saved')}>
            Save hold time
          </Button>
          <Field label="Hold cash-on-pickup orders (hours)" value={cashHours} onChange={(e) => setCashHours(e.target.value)} inputMode="numeric" />
          <Button className="self-end" variant="secondary" onClick={() => saveCash({ hours: Number(cashHours) }, 'Pickup hold saved')}>
            Save pickup hold
          </Button>
          <Field label="Never sell online the last (units per size per store)" value={buffer} onChange={(e) => setBuffer(e.target.value)} inputMode="numeric" />
          <Button className="self-end" variant="secondary" onClick={() => saveBuffer({ units: Number(buffer) }, 'Safety buffer saved')}>
            Save buffer
          </Button>
        </div>
      </Card>
      <Card title="Returns">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Size exchange within (days)" value={exchange} onChange={(e) => setExchange(e.target.value)} inputMode="numeric" />
          <Field label="Refund within (days)" value={refund} onChange={(e) => setRefund(e.target.value)} inputMode="numeric" hint="Not longer than the exchange window." />
        </div>
        <p className="mt-2 text-sm text-graphite">Not returnable: {s.return_rules.nonReturnable.join(', ')}. Update the returns help page when these change.</p>
        <Button className="mt-3" variant="secondary" onClick={() => saveReturns({ exchangeDays: Number(exchange), refundDays: Number(refund), nonReturnable: s.return_rules.nonReturnable }, 'Return rules saved')}>
          Save return rules
        </Button>
      </Card>
    </div>
  );
}

/** The .90 price rule as one switch: saved as soon as it is flipped. */
function PriceRuleCard({ on }: { on: boolean }) {
  const save = useSetting('/v1/admin/settings/price_rounding');
  return (
    <Card title="Prices">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="price-rule" className="font-semibold">
            End prices in .90
          </p>
          <p className="mt-0.5 text-sm text-graphite">
            {on ? 'On: a price like $12.00 is saved as $11.90, everywhere prices are entered.' : 'Off: prices are saved exactly as typed, for example $0.01 for a test payment.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="price-rule"
          onClick={() => save({ endInNinety: !on }, on ? 'Prices are now saved exactly as typed' : 'Prices now end in .90')}
          className={cx('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-obsidian', on ? 'bg-success' : 'bg-[#C9C5BB]')}
        >
          <span aria-hidden className={cx('inline-block size-5 rounded-full bg-paper shadow transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>
      <p className="mt-3 text-xs text-graphite">Prices already saved don't change when you flip this. "Was" prices are never rounded.</p>
    </Card>
  );
}

function RateCard({ rate }: { rate: number }) {
  const [v, setV] = useState(String(rate));
  const save = useSetting('/v1/admin/settings/pricing/khr_rate');
  return (
    <Card title="Riel rate">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Riel per dollar" value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" className="w-40" />
        <Button variant="secondary" className="mb-0.5" onClick={() => save({ rate: Number(v) }, 'Rate saved')}>
          Save rate
        </Button>
      </div>
    </Card>
  );
}

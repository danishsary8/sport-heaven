import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { isApiError } from '../../../lib/api';
import { formatDate, formatUsd, useI18n, type DictKey } from '../../../lib/i18n';
import { Button, EmptyState, ErrorState, PageTitle, QueryView, Select, Seo, Skeleton, TextArea, cx, useToast } from '../../../ui';
import { useProduct } from '../../catalog/api';
import { useCreateReturn, useMyOrder, useMyReturns, type MyOrder, type ReturnBody } from '../api';
import { canReturn } from '../returns';

/** Reasons are sent in English whatever the page language, so staff always read them in one language. */
const REASONS = ['Too small', 'Too big', 'Changed my mind', 'Faulty or damaged', 'Not as pictured', 'Other'] as const;
const REASON_KEY: Record<(typeof REASONS)[number], DictKey> = {
  'Too small': 'ret.reason.small',
  'Too big': 'ret.reason.big',
  'Changed my mind': 'ret.reason.mind',
  'Faulty or damaged': 'ret.reason.faulty',
  'Not as pictured': 'ret.reason.pictured',
  Other: 'ret.reason.other',
};

export function MyReturnsPage() {
  const { t, lang } = useI18n();
  const returns = useMyReturns();
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.returns')} noindex />
      <PageTitle>{t('acc.nav.returns')}</PageTitle>
      <QueryView query={returns} skeleton={<Skeleton className="h-40 w-full" />} isEmpty={(d) => d.returns.length === 0} empty={<EmptyState title={t('ret.none')} body={t('ret.noneBody')} />}>
        {(d) => (
          <ul className="flex flex-col gap-3">
            {d.returns.map((r) => (
              <li key={r.number} className="rounded-[8px] border border-stone p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{t('ret.number', { number: r.number })}</p>
                  <span className={cx('rounded-full px-3 py-1 text-sm font-semibold', r.status === 'approved' ? 'bg-success/10 text-success' : r.status === 'rejected' ? 'bg-stone text-graphite' : 'bg-cobalt/10 text-cobalt')}>
                    {t(`ret.status.${r.status}` as DictKey)}
                  </span>
                </div>
                <p className="text-sm text-graphite">
                  {t('ret.forOrder', { number: r.orderNumber, date: formatDate(r.createdAt, lang) })}
                </p>
                <ul className="mt-2 text-[15px]">
                  {r.items.map((i) => (
                    <li key={i.orderItemId}>
                      {t('ret.itemLine', { qty: i.qty, name: i.name, size: i.size })}
                      {i.exchangeSize && ` ${t('ret.toSize', { size: i.exchangeSize })}`}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-sm">{r.resolution === 'refund' ? t('ret.refundOf', { amount: formatUsd(r.refundCents) }) : t(`ret.res.${r.resolution}` as DictKey)}</p>
                {r.decisionNote && <p className="mt-1 text-sm text-graphite">{r.decisionNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </div>
  );
}

export function NewReturnPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const number = params.get('order') ?? '';
  const order = useMyOrder(number);
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('ret.title')} noindex />
      <PageTitle>{t('ret.title')}</PageTitle>
      {!number ? (
        <EmptyState title={t('ret.chooseOrder')} action={<Link to="/account/orders" className="font-semibold underline underline-offset-4">{t('acc.nav.orders')}</Link>} />
      ) : (
        <QueryView query={order} skeleton={<Skeleton className="h-64 w-full" />}>
          {(d) => (canReturn(d.order) ? <ReturnForm order={d.order} /> : <EmptyState title={t('ret.notReturnable')} body={t('ret.notReturnableBody')} />)}
        </QueryView>
      )}
    </div>
  );
}

type Item = MyOrder['order']['items'][number];
interface Choice {
  on: boolean;
  qty: number;
  exchangeVariantId: string;
}

function ReturnForm({ order }: { order: MyOrder['order'] }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const create = useCreateReturn();
  const items = order.items.filter((i) => i.returnableQty > 0);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState<'refund' | 'size_exchange' | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const refundOpen = !!order.returnWindow && new Date(order.returnWindow.refundUntil).getTime() > now;
  const set = (id: string, patch: Partial<Choice>) => setChoices((c) => ({ ...c, [id]: { ...(c[id] ?? { on: false, qty: 1, exchangeVariantId: '' }), ...patch } }));
  const chosen = items.filter((i) => choices[i.id]?.on);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (chosen.length === 0) return setError(t('ret.err.items'));
    if (!reason) return setError(t('ret.err.reason'));
    if (!resolution) return setError(t('ret.err.resolution'));
    if (resolution === 'size_exchange' && chosen.some((i) => !choices[i.id]!.exchangeVariantId)) return setError(t('ret.err.size'));
    setError(null);
    const body: ReturnBody = {
      orderNumber: order.number,
      resolution,
      items: chosen.map((i) => ({
        orderItemId: i.id,
        qty: choices[i.id]!.qty,
        reason,
        ...(resolution === 'size_exchange' ? { exchangeVariantId: choices[i.id]!.exchangeVariantId } : {}),
      })),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    create.mutate(body, {
      // Go to the returns list: the order may have nothing left to return, which would replace this form.
      onSuccess: () => {
        toast.success(t('ret.sent'));
        void navigate('/account/returns', { replace: true });
      },
      onError: (err) => setError(isApiError(err) ? err.message : t('common.error')),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <p className="text-graphite">{t('ret.forOrderShort', { number: order.number })}</p>
      {error && <ErrorState message={error} />}
      <fieldset>
        <legend className="mb-2 font-semibold">{t('ret.which')}</legend>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <ItemChoice key={i.id} item={i} choice={choices[i.id]} onChange={(p) => set(i.id, p)} exchange={resolution === 'size_exchange'} />
          ))}
        </ul>
      </fieldset>
      <Select label={t('ret.why')} value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">{t('co.choose')}</option>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {t(REASON_KEY[r])}
          </option>
        ))}
      </Select>
      <fieldset>
        <legend className="mb-2 font-semibold">{t('ret.want')}</legend>
        <div className="flex flex-col gap-2">
          <label className={cx('flex cursor-pointer gap-3 rounded-[8px] border p-3', resolution === 'size_exchange' ? 'border-obsidian' : 'border-stone')}>
            <input type="radio" name="resolution" className="mt-1 size-[18px] accent-obsidian" checked={resolution === 'size_exchange'} onChange={() => setResolution('size_exchange')} />
            <span>
              <span className="block font-semibold">{t('ret.res.size_exchange')}</span>
              <span className="block text-sm text-graphite">{t('ret.exchangeHint')}</span>
            </span>
          </label>
          <label className={cx('flex gap-3 rounded-[8px] border p-3', !refundOpen ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', resolution === 'refund' ? 'border-obsidian' : 'border-stone')}>
            <input type="radio" name="resolution" className="mt-1 size-[18px] accent-obsidian" disabled={!refundOpen} checked={resolution === 'refund'} onChange={() => setResolution('refund')} />
            <span>
              <span className="block font-semibold">{t('ret.res.refund')}</span>
              <span className="block text-sm text-graphite">{refundOpen ? t('ret.refundHint') : t('ret.refundClosed')}</span>
            </span>
          </label>
        </div>
      </fieldset>
      <TextArea label={t('ret.note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      <Button type="submit" variant="primary" size="lg" loading={create.isPending} className="self-start">
        {t('ret.send')}
      </Button>
    </form>
  );
}

function ItemChoice({ item, choice, onChange, exchange }: { item: Item; choice: Choice | undefined; onChange(p: Partial<Choice>): void; exchange: boolean }) {
  const { t } = useI18n();
  const on = !!choice?.on;
  return (
    <li className={cx('rounded-[8px] border p-3', on ? 'border-obsidian' : 'border-stone')}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 size-[18px] accent-obsidian" checked={on} onChange={(e) => onChange({ on: e.target.checked })} />
        <span>
          <span className="block font-medium">{item.name}</span>
          <span className="block text-sm text-graphite">{t('bag.details', { size: item.size, color: item.color })}</span>
        </span>
      </label>
      {on && (
        <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-2">
          {item.returnableQty > 1 && (
            <Select label={t('ret.qty')} value={String(choice?.qty ?? 1)} onChange={(e) => onChange({ qty: Number(e.target.value) })}>
              {Array.from({ length: item.returnableQty }, (_, i) => (
                <option key={i + 1}>{i + 1}</option>
              ))}
            </Select>
          )}
          {exchange && <ExchangeSize item={item} value={choice?.exchangeVariantId ?? ''} onChange={(v) => onChange({ exchangeVariantId: v })} />}
        </div>
      )}
    </li>
  );
}

function ExchangeSize({ item, value, onChange }: { item: Item; value: string; onChange(v: string): void }) {
  const { t } = useI18n();
  const product = useProduct(item.productSlug);
  const options = (product.data?.product.variants ?? []).filter((v) => v.color === item.color && v.size !== item.size && v.availability !== 'out');
  return (
    <Select label={t('ret.newSize')} value={value} onChange={(e) => onChange(e.target.value)} disabled={product.isPending}>
      <option value="">{product.isPending ? t('common.loading') : options.length ? t('co.choose') : t('ret.noSizes')}</option>
      {options.map((v) => (
        <option key={v.id} value={v.id}>
          {v.size}
        </option>
      ))}
    </Select>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Store, Truck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { isApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatKhr, formatUsd, useI18n, type DictKey } from '../../lib/i18n';
import { Button, Field, PageTitle, Picture, QueryView, Seo, Skeleton, TextArea, cx } from '../../ui';
import { useAddresses } from '../account/api';
import { useCart, type Cart } from '../cart/api';
import { PromoField } from '../cart/BagContents';
import { lineDetails } from '../cart/lineDetails';
import { EmptyBag } from '../cart/BagPage';
import { placeName } from '../geo/api';
import { AddressFields } from './AddressFields';
import { EMPTY_ADDRESS, looksLikePhone, type AddressDraft } from './address';
import { usePlaceOrder, useQuote, type OrderBody, type Quote, type QuoteBody } from './api';
import { saveOrderAccess } from './orderAccess';

type Method = OrderBody['paymentMethod'];
type Channel = OrderBody['contact']['channel'];
type Errors = Record<string, string | undefined>;

const PAY_LABEL: Record<Method, DictKey> = {
  aba_khqr: 'co.pay.aba_khqr',
  card: 'co.pay.card',
  acleda: 'co.pay.acleda',
  wing: 'co.pay.wing',
  cash_on_pickup: 'co.pay.cash_on_pickup',
};

const newKey = () => (typeof globalThis.crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function CheckoutPage() {
  const { t } = useI18n();
  const cart = useCart();
  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-16 pt-6 lg:px-8 lg:pt-10">
      <Seo title={t('co.title')} noindex />
      <PageTitle>{t('co.title')}</PageTitle>
      <QueryView query={cart} skeleton={<Skeleton className="mt-6 h-96 w-full" />} isEmpty={(d) => d.cart.lines.length === 0} empty={<EmptyBag />}>
        {({ cart: c }) => <CheckoutForm cart={c} />}
      </QueryView>
    </div>
  );
}

function CheckoutForm({ cart }: { cart: Cart }) {
  const { t, lang } = useI18n();
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addresses = useAddresses();
  const place = usePlaceOrder();
  const key = useRef(newKey());
  // The key may only be reused for the very same order (a retry after a lost answer).
  const keyBody = useRef<string | null>(null);

  const [contact, setContact] = useState({ name: '', phone: '', email: '', channel: 'phone' as Channel });
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [addressId, setAddressId] = useState<string | 'new' | null>(null);
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [shippingMethodId, setShipping] = useState<string>('');
  const [pickupBranchId, setPickup] = useState('');
  const [paymentMethod, setPayment] = useState<Method | ''>('');
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Members: fill the contact from the account once it is known.
  useEffect(() => {
    if (!user) return;
    setContact((c) => ({ ...c, name: c.name || user.fullName || '', phone: c.phone || user.phone || '', email: c.email || user.email || '' }));
  }, [user]);

  const saved = addresses.data?.addresses ?? [];
  const chosenSaved = addressId && addressId !== 'new' ? saved.find((a) => a.id === addressId) : undefined;
  useEffect(() => {
    if (addressId === null && saved.length > 0) setAddressId((saved.find((a) => a.isDefault) ?? saved[0]!).id);
  }, [saved, addressId]);
  const useSaved = status === 'member' && saved.length > 0 && addressId !== 'new';

  const provinceCode = useSaved ? chosenSaved?.province.code : address.provinceCode;
  const quoteBody: QuoteBody =
    fulfillment === 'pickup'
      ? { fulfillment, ...(pickupBranchId ? { pickupBranchId } : {}) }
      : { fulfillment, ...(provinceCode ? { provinceCode } : {}), ...(shippingMethodId ? { shippingMethodId } : {}) };
  const quote = useQuote(quoteBody);
  const q: Quote | undefined = quote.data;

  const available = (q?.shippingOptions ?? []).filter((o) => o.available);
  // Keep choices valid when the options change (province or fulfilment changed).
  useEffect(() => {
    if (!q || fulfillment !== 'delivery' || !provinceCode) return;
    if (shippingMethodId && !available.some((o) => o.methodId === shippingMethodId)) setShipping('');
    else if (!shippingMethodId && available.length === 1) setShipping(available[0]!.methodId);
  }, [q, fulfillment, provinceCode, shippingMethodId, available]);
  useEffect(() => {
    if (q && paymentMethod && !q.paymentMethods.includes(paymentMethod)) setPayment('');
  }, [q, paymentMethod]);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!contact.name.trim()) e['contact.name'] = t('co.err.name');
    if (!contact.phone.trim()) e['contact.phone'] = t('co.err.phone');
    else if (!looksLikePhone(contact.phone)) e['contact.phone'] = t('co.err.phoneFormat');
    if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) e['contact.email'] = t('co.err.email');
    if (fulfillment === 'delivery') {
      if (!useSaved) {
        if (!address.provinceCode) e['address.provinceCode'] = t('co.err.province');
        if (!address.districtCode) e['address.districtCode'] = t('co.err.district');
        if (!address.communeCode) e['address.communeCode'] = t('co.err.commune');
        if (!address.street.trim()) e['address.street'] = t('co.err.street');
        if (address.phone.trim() && !looksLikePhone(address.phone)) e['address.phone'] = t('co.err.phoneFormat');
      } else if (!chosenSaved) e.addressId = t('co.err.address');
      if (!shippingMethodId) e.shippingMethodId = t('co.err.shipping');
    } else if (!pickupBranchId) e.pickupBranchId = t('co.err.pickup');
    if (!paymentMethod) e.paymentMethod = t('co.err.payment');
    if (!terms) e.acceptTerms = t('co.err.terms');
    return e;
  };

  const focusFirst = (e: Errors) => {
    const first = Object.keys(e)[0];
    if (!first) return;
    requestAnimationFrame(() => (document.getElementById(first) ?? document.querySelector<HTMLElement>(`[data-field="${first}"] input`))?.focus());
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (place.isPending) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError(t('co.err.summary'));
      focusFirst(e);
      return;
    }
    setFormError(null);
    const body: OrderBody = {
      contact: { name: contact.name.trim(), phone: contact.phone.trim(), channel: contact.channel, ...(contact.email.trim() ? { email: contact.email.trim() } : {}) },
      fulfillment,
      paymentMethod: paymentMethod as Method,
      acceptTerms: true,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    if (fulfillment === 'pickup') body.pickupBranchId = pickupBranchId;
    else {
      body.shippingMethodId = shippingMethodId as OrderBody['shippingMethodId'];
      if (useSaved && chosenSaved) body.addressId = chosenSaved.id;
      else
        body.address = {
          recipientName: address.recipientName.trim() || contact.name.trim(),
          phone: address.phone.trim() || contact.phone.trim(),
          provinceCode: address.provinceCode,
          districtCode: address.districtCode,
          communeCode: address.communeCode,
          street: address.street.trim(),
          ...(address.landmark.trim() ? { landmark: address.landmark.trim() } : {}),
        };
    }
    const fingerprint = JSON.stringify(body);
    if (keyBody.current !== null && keyBody.current !== fingerprint) key.current = newKey();
    keyBody.current = fingerprint;
    place.mutate(
      { body, key: key.current },
      {
        onSuccess: (res) => {
          key.current = newKey();
          saveOrderAccess(res.order.number, { token: res.orderAccessToken ?? '', phone: contact.phone.trim() });
          void qc.invalidateQueries({ queryKey: ['cart'] });
          const pay = res.order.paymentMethod !== 'cash_on_pickup' && res.order.paymentStatus === 'unpaid';
          void navigate(pay ? `/pay/${res.order.number}` : `/order/${res.order.number}`, { replace: true });
        },
        onError: (err) => {
          // A lost connection or a 5xx may mean the order was received: retry with the same key.
          if (!isApiError(err) || !(err.status === 0 || err.status >= 500)) key.current = newKey();
          if (isApiError(err, 'validation_failed') && Array.isArray(err.details)) {
            const mapped: Errors = {};
            for (const d of err.details as { path?: string; message?: string }[]) if (d.path) mapped[d.path] = d.message;
            setErrors(mapped);
            setFormError(t('co.err.summary'));
            focusFirst(mapped);
            return;
          }
          setFormError(isApiError(err) ? err.message : t('common.error'));
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-8">
        {formError && (
          <p role="alert" className="rounded-[6px] border border-vermilion bg-vermilion/5 px-4 py-3 font-medium text-vermilion">
            {formError}
          </p>
        )}
        {status !== 'member' && (
          <p className="text-[15px]">
            {t('co.haveAccount')}{' '}
            <Link to="/sign-in" state={{ from: '/checkout' }} className="font-semibold underline underline-offset-4">
              {t('nav.signIn')}
            </Link>
          </p>
        )}

        <Step title={t('co.contact')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="contact.name" label={t('co.name')} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} error={errors['contact.name']} autoComplete="name" maxLength={120} />
            <Field id="contact.phone" label={t('co.phone')} type="tel" inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} error={errors['contact.phone']} autoComplete="tel" maxLength={40} />
            <Field id="contact.email" label={t('co.email')} type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={errors['contact.email']} hint={t('co.emailHint')} autoComplete="email" maxLength={200} />
            <fieldset data-field="contact.channel">
              <legend className="mb-1.5 text-sm font-semibold">{t('co.channel')}</legend>
              <div className="flex flex-wrap gap-2">
                {(['phone', 'telegram', 'whatsapp'] as Channel[]).map((c) => (
                  <Chip key={c} name="channel" checked={contact.channel === c} onChange={() => setContact({ ...contact, channel: c })}>
                    {t(`co.channel.${c}` as DictKey)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
        </Step>

        <Step title={t('co.howToGet')}>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('co.howToGet')}>
            <BigChoice name="fulfillment" checked={fulfillment === 'delivery'} onChange={() => setFulfillment('delivery')} icon={<Truck className="size-5" aria-hidden />} title={t('co.delivery')} body={t('co.deliveryBody')} />
            <BigChoice name="fulfillment" checked={fulfillment === 'pickup'} onChange={() => setFulfillment('pickup')} icon={<Store className="size-5" aria-hidden />} title={t('co.pickup')} body={t('co.pickupBody')} />
          </div>

          {fulfillment === 'delivery' ? (
            <div className="mt-5 flex flex-col gap-5">
              {status === 'member' && saved.length > 0 && (
                <fieldset data-field="addressId">
                  <legend className="mb-2 text-sm font-semibold">{t('co.savedAddresses')}</legend>
                  <div className="flex flex-col gap-2">
                    {saved.map((a) => (
                      <label key={a.id} className={cx('flex cursor-pointer gap-3 rounded-[8px] border p-3', addressId === a.id ? 'border-obsidian' : 'border-stone')}>
                        <input type="radio" name="address" className="mt-1 size-[18px] accent-obsidian" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span className="text-[15px]">
                          <span className="font-semibold">{a.label}</span>
                          <span className="block">{a.street}</span>
                          <span className="block text-graphite">
                            {[placeName(a.commune, lang), placeName(a.district, lang), placeName(a.province, lang)].join(', ')}
                          </span>
                        </span>
                      </label>
                    ))}
                    <label className={cx('flex cursor-pointer items-center gap-3 rounded-[8px] border p-3', addressId === 'new' ? 'border-obsidian' : 'border-stone')}>
                      <input type="radio" name="address" className="size-[18px] accent-obsidian" checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                      <span className="font-semibold">{t('co.newAddress')}</span>
                    </label>
                  </div>
                </fieldset>
              )}
              {!useSaved && <AddressFields value={address} onChange={setAddress} errors={errors} />}

              <fieldset data-field="shippingMethodId">
                <legend className="mb-2 text-sm font-semibold">{t('co.deliveryOption')}</legend>
                {!provinceCode ? (
                  <p className="text-sm text-graphite">{t('co.chooseProvinceFirst')}</p>
                ) : available.length === 0 && q ? (
                  <p className="text-sm text-graphite">{t('bag.noDelivery')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {available.map((o) => (
                      <label key={o.methodId} className={cx('flex cursor-pointer items-center gap-3 rounded-[8px] border p-3', shippingMethodId === o.methodId ? 'border-obsidian' : 'border-stone')}>
                        <input type="radio" name="shipping" className="size-[18px] accent-obsidian" checked={shippingMethodId === o.methodId} onChange={() => setShipping(o.methodId)} />
                        <span className="flex-1">
                          <span className="font-semibold">{o.name}</span>
                          {o.eta && <span className="block text-sm text-graphite">{o.eta}</span>}
                        </span>
                        <span className="tabular font-semibold">{o.feeCents === 0 ? t('bag.free') : o.feeCents != null ? formatUsd(o.feeCents) : ''}</span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.shippingMethodId && <p className="mt-1.5 text-sm font-medium text-vermilion">{errors.shippingMethodId}</p>}
              </fieldset>
            </div>
          ) : (
            <fieldset data-field="pickupBranchId" className="mt-5">
              <legend className="mb-2 text-sm font-semibold">{t('co.pickupStore')}</legend>
              <div className="flex flex-col gap-2">
                {(q?.pickupBranches ?? []).map((b) => (
                  <label key={b.id} className={cx('flex cursor-pointer items-center gap-3 rounded-[8px] border p-3', pickupBranchId === b.id ? 'border-cobalt' : 'border-stone')}>
                    <input type="radio" name="pickup" className="size-[18px] accent-[#032EA1]" checked={pickupBranchId === b.id} onChange={() => setPickup(b.id)} aria-label={b.name} />
                    <MapPin className="size-4 text-cobalt" aria-hidden />
                    <span className="font-semibold">{b.name}</span>
                  </label>
                ))}
              </div>
              {errors.pickupBranchId && <p className="mt-1.5 text-sm font-medium text-vermilion">{errors.pickupBranchId}</p>}
            </fieldset>
          )}
        </Step>

        <Step title={t('co.payment')}>
          <fieldset data-field="paymentMethod">
            <legend className="sr-only">{t('co.payment')}</legend>
            <div className="flex flex-col gap-2">
              {(q?.paymentMethods ?? []).map((m) => (
                <label key={m} className={cx('flex cursor-pointer items-center gap-3 rounded-[8px] border p-3', paymentMethod === m ? 'border-obsidian' : 'border-stone')}>
                  <input type="radio" name="payment" className="size-[18px] accent-obsidian" checked={paymentMethod === m} onChange={() => setPayment(m)} />
                  <span className="flex-1">
                    <span className="font-semibold">{t(PAY_LABEL[m])}</span>
                    <span className="block text-sm text-graphite">{t(`${PAY_LABEL[m]}.hint` as DictKey)}</span>
                  </span>
                </label>
              ))}
              {quote.isPending && <Skeleton className="h-14 w-full" />}
            </div>
            {errors.paymentMethod && <p className="mt-1.5 text-sm font-medium text-vermilion">{errors.paymentMethod}</p>}
          </fieldset>
        </Step>

        <Step title={t('co.extra')}>
          <TextArea id="note" label={t('co.note')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} hint={t('co.noteHint')} />
        </Step>
      </div>

      <aside aria-label={t('bag.summary')} className="flex h-fit flex-col gap-4 rounded-[8px] border border-stone bg-chalk p-5 lg:sticky lg:top-6 lg:p-6">
        <h2 className="font-display text-2xl font-bold">{t('bag.summary')}</h2>
        <ul className="flex flex-col gap-3 border-b border-stone pb-4 text-[15px]">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-start gap-3">
              <Picture src={l.imageUrl} alt="" sizes="48px" width={48} height={64} className="stage block h-16 w-12 shrink-0 overflow-hidden rounded-[4px]" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 leading-snug">
                  {l.qty} × {l.productName}
                </span>
                <span className="mt-0.5 block text-sm text-graphite">{lineDetails(l, t)}</span>
              </span>
              <span className="tabular shrink-0 font-medium">{formatUsd(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <PromoField cart={q?.cart ?? cart} />
        <Totals quote={q} cart={cart} known={fulfillment === 'pickup' || !!shippingMethodId} />
        <label data-field="acceptTerms" className="flex cursor-pointer items-start gap-3 text-[15px]">
          <input id="acceptTerms" type="checkbox" className="mt-0.5 size-5 accent-obsidian" checked={terms} onChange={(e) => setTerms(e.target.checked)} aria-invalid={errors.acceptTerms ? true : undefined} />
          <span>
            {t('co.terms')}{' '}
            <Link to="/help/terms" target="_blank" className="underline underline-offset-4">
              {t('footer.terms')}
            </Link>
          </span>
        </label>
        {errors.acceptTerms && <p className="-mt-2 text-sm font-medium text-vermilion">{errors.acceptTerms}</p>}
        <Button type="submit" variant="buy" size="lg" block loading={place.isPending}>
          {t('co.place')}
        </Button>
        <p className="text-sm text-graphite">{t('co.holdNote')}</p>
      </aside>
    </form>
  );
}

function Totals({ quote, cart, known }: { quote: Quote | undefined; cart: Cart; known: boolean }) {
  const { t, lang } = useI18n();
  const p = quote?.cart.pricing ?? cart.pricing;
  return (
    <dl className="flex flex-col gap-1.5 border-t border-stone pt-3 text-[15px]">
      <div className="flex justify-between">
        <dt>{t('bag.items')}</dt>
        <dd className="tabular">{formatUsd(p.merchandiseCents)}</dd>
      </div>
      {p.discounts.map((d) => (
        <div key={`${d.kind}-${d.label}`} className="flex justify-between text-vermilion">
          <dt>{d.label}</dt>
          <dd className="tabular">−{formatUsd(d.amountCents)}</dd>
        </div>
      ))}
      <div className="flex justify-between">
        <dt>{t('bag.delivery')}</dt>
        <dd className="tabular">{!known || !quote ? <span className="text-graphite">{t('co.chooseDelivery')}</span> : p.shippingCents ? formatUsd(p.shippingCents) : t('bag.free')}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-stone pt-2 text-lg font-semibold">
        <dt>{t('co.total')}</dt>
        <dd className="tabular">{formatUsd(p.totalCents)}</dd>
      </div>
      {known && quote && <p className="text-right text-sm text-graphite tabular">{formatKhr(p.totalKhr, lang)}</p>}
    </dl>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-3xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ name, checked, onChange, children }: { name: string; checked: boolean; onChange(): void; children: ReactNode }) {
  return (
    <label
      className={cx(
        'cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-obsidian',
        checked ? 'border-obsidian bg-obsidian text-paper' : 'border-[#C9C5BB]',
      )}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

function BigChoice({ name, checked, onChange, icon, title, body }: { name: string; checked: boolean; onChange(): void; icon: ReactNode; title: string; body: string }) {
  return (
    <label className={cx('flex cursor-pointer gap-3 rounded-[8px] border-2 p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-obsidian', checked ? 'border-obsidian' : 'border-stone')}>
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      {icon}
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-graphite">{body}</span>
      </span>
    </label>
  );
}

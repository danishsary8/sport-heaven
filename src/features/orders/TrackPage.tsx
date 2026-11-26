import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { isApiError } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Button, Field, Seo } from '../../ui';
import { looksLikePhone } from '../checkout/AddressFields';
import { saveOrderAccess } from '../checkout/orderAccess';
import { useTrackOrder } from './api';
import { Fulfilment, OrderItems, OrderTotals, StatusBadge, Timeline } from './OrderParts';

/** Track by order number + phone. The answer is masked; an unpaid order can be paid or cancelled from here. */
export function TrackPage() {
  const { t } = useI18n();
  const track = useTrackOrder();
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ number?: string; phone?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = number.trim().toUpperCase();
    const next = { number: n ? undefined : t('track.err.number'), phone: looksLikePhone(phone) ? undefined : t('co.err.phoneFormat') };
    setErrors(next);
    if (next.number || next.phone) return;
    track.mutate(
      { orderNumber: n, phone: phone.trim() },
      { onSuccess: (res) => res.orderAccessToken && saveOrderAccess(res.order.number, { token: res.orderAccessToken, phone: phone.trim() }) },
    );
  };

  const o = track.data?.order;
  return (
    <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-8 lg:px-8 lg:pt-12">
      <Seo title={t('nav.track')} noindex />
      <h1 className="font-display text-5xl font-bold">{t('nav.track')}</h1>
      <form onSubmit={submit} noValidate className="mt-6 grid max-w-[720px] gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Field label={t('track.number')} value={number} onChange={(e) => setNumber(e.target.value)} error={errors.number} autoCapitalize="characters" autoComplete="off" maxLength={40} hint={t('track.numberHint')} />
        <Field label={t('track.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} />
        <Button type="submit" variant="primary" loading={track.isPending} className="sm:mt-[26px]">
          {t('track.find')}
        </Button>
      </form>
      {track.isError && (
        <p role="alert" className="mt-4 font-medium text-vermilion">
          {isApiError(track.error) ? track.error.message : t('common.error')}
        </p>
      )}
      {o && (
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-3xl font-bold">{t('order.title', { number: o.number })}</h2>
              <StatusBadge status={o.status} />
            </div>
            {track.data?.orderAccessToken && o.status === 'pending_payment' && (
              <Link to={`/pay/${o.number}`} className="inline-flex h-12 w-fit items-center rounded-[6px] bg-vermilion px-6 font-semibold text-paper">
                {t('order.payNow')}
              </Link>
            )}
            {track.data?.orderAccessToken && (
              <Link to={`/order/${o.number}`} className="font-semibold underline underline-offset-4">
                {t('track.manage')}
              </Link>
            )}
            <OrderItems items={o.items} />
            <OrderTotals pricing={o.pricing} />
          </div>
          <aside className="flex flex-col gap-6">
            <Timeline timeline={o.timeline} />
            <Fulfilment order={o} />
          </aside>
        </div>
      )}
    </section>
  );
}

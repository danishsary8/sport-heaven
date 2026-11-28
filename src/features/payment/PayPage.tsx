import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { isApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatKhr, formatUsd, useI18n } from '../../lib/i18n';
import { Clock3, CreditCard, Lock, ScanLine } from 'lucide-react';
import { Button, EmptyState, ErrorState, METHOD_MARKS, PageTitle, PaymentMarks, QueryView, Seo, Skeleton, cx } from '../../ui';
import { rememberCardReturn } from '../checkout/orderAccess';
import { invalidateOrder, useOrder, usePaymentStatus, useSwitchPayment, type OrderView, type Payment, type PayMethod } from '../orders/api';

const METHODS: PayMethod[] = ['aba_khqr', 'card'];

export function PayPage() {
  const { number = '' } = useParams();
  const { t } = useI18n();
  const { status } = useAuth();
  const order = useOrder(number);
  if (order.isError && isApiError(order.error) && [401, 403, 404].includes(order.error.status)) {
    return (
      <section className="mx-auto max-w-[640px] px-4 py-10">
        <Seo title={t('pay.title')} noindex />
        <EmptyState
          title={t('pay.noAccess')}
          body={status === 'member' ? t('pay.noAccessMember') : t('pay.noAccessBody')}
          action={
            <Link to="/track" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
              {t('pay.findOrder')}
            </Link>
          }
        />
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-[1040px] px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
      <Seo title={t('pay.title')} noindex />
      <QueryView query={order} skeleton={<Skeleton className="h-[480px] w-full" />}>
        {(d) => <PayView order={d.order} initialPayment={d.payment ?? null} />}
      </QueryView>
    </section>
  );
}

function PayView({ order, initialPayment }: { order: OrderView; initialPayment: Payment | null }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const unpaid = order.paymentStatus === 'unpaid' && order.status === 'pending_payment';
  const status = usePaymentStatus(order.number, unpaid);
  const switchPay = useSwitchPayment(order.number);
  const [choosing, setChoosing] = useState(false);

  const current = status.data;
  // The newest attempt wins, whether it came from switching method or from polling.
  const candidates = [switchPay.data?.payment, current?.latestPayment, initialPayment].filter((p): p is Payment => !!p);
  const payment: Payment | null = candidates.sort((a, b) => b.attempt - a.attempt)[0] ?? null;
  const orderStatus = current?.status ?? order.status;
  const paid = (current?.paymentStatus ?? order.paymentStatus) === 'paid';
  const reservedUntil = current?.reservedUntil ?? order.reservedUntil;

  useEffect(() => {
    if (!paid) return;
    // The order page must not show the cached unpaid order.
    void invalidateOrder(qc, order.number).then(() => navigate(`/order/${order.number}`, { replace: true }));
  }, [paid, navigate, order.number, qc]);

  if (orderStatus === 'expired' || orderStatus === 'cancelled') {
    return (
      <EmptyState
        title={orderStatus === 'expired' ? t('pay.expired') : t('pay.cancelled')}
        body={t('pay.expiredBody')}
        action={
          <Link to="/bag" className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
            {t('pay.backToBag')}
          </Link>
        }
      />
    );
  }
  if (orderStatus !== 'pending_payment') {
    return (
      <EmptyState
        title={t('pay.nothingToPay')}
        action={
          <Link to={`/order/${order.number}`} className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
            {t('pay.seeOrder')}
          </Link>
        }
      />
    );
  }

  // The bank approved the payment but it needs a staff check (e.g. an amount in riel): never offer to pay again.
  if (payment?.status === 'approved') {
    return (
      <EmptyState
        title={t('pay.receivedTitle')}
        body={t('pay.receivedBody')}
        action={
          <Link to={`/order/${order.number}`} className="inline-flex h-11 items-center rounded-[6px] bg-obsidian px-5 font-semibold text-paper">
            {t('pay.seeOrder')}
          </Link>
        }
      />
    );
  }

  const instructions = payment?.instructions ?? null;
  const usable = payment && payment.status === 'pending' && instructions && instructions.kind !== 'none';
  const showChooser = choosing || !usable;
  const amountCents = payment?.amountCents ?? order.pricing.totalCents;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-graphite">{t('pay.orderNumber', { number: order.number })}</p>
        <PageTitle className="mt-1">{instructions?.kind === 'redirect' && !showChooser ? t('pay.cardTitle') : t('pay.title')}</PageTitle>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:items-start lg:gap-10">
        <div className="flex flex-col gap-3 md:order-2">
          <div className="overflow-hidden rounded-[16px] bg-obsidian text-paper">
            <div className="flex items-end justify-between gap-3 p-5">
              <span className="text-[15px] text-paper/70">{t('pay.amount')}</span>
              <span className="text-right">
                <span className="tabular block font-display text-[44px] font-bold leading-none">{formatUsd(amountCents)}</span>
                <span className="tabular mt-1 block text-sm text-paper/60">{formatKhr(order.pricing.totalKhr, lang)}</span>
              </span>
            </div>
            {reservedUntil && <Countdown until={reservedUntil} />}
          </div>
          {switchPay.isError && <ErrorState message={isApiError(switchPay.error) ? switchPay.error.message : undefined} />}
          {!showChooser && (
            <p className="flex items-center gap-3 rounded-[12px] bg-chalk px-4 py-3 text-[15px] font-medium">
              <span aria-hidden className="live-dot size-2.5 shrink-0 rounded-full bg-success" />
              {t('pay.live')}
            </p>
          )}
          {!showChooser && instructions?.kind === 'qr' && (
            <ol className="flex flex-col gap-3 rounded-[16px] border border-stone p-5 text-[15px]">
              {(['pay.step1', 'pay.step2', 'pay.step3'] as const).map((k, i) => (
                <li key={k} className="flex gap-3">
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-stone font-display text-[15px] font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{t(k)}</span>
                </li>
              ))}
            </ol>
          )}
          {!showChooser && (
            <Button variant="secondary" className="rounded-[10px]" onClick={() => setChoosing(true)}>
              {t('pay.another')}
            </Button>
          )}
          <p className="text-sm text-graphite">{t('pay.waiting')}</p>
        </div>

        <div className="md:order-1">
          {showChooser ? (
            <div className="flex flex-col gap-2 rounded-[16px] border border-stone p-5">
              <h2 className="mb-1 font-display text-2xl font-bold">{t('pay.choose')}</h2>
              {METHODS.map((m) => (
                <Button
                  key={m}
                  variant={m === 'aba_khqr' ? 'buy' : 'secondary'}
                  size="lg"
                  block
                  className="justify-between rounded-[10px]"
                  loading={switchPay.isPending && switchPay.variables === m}
                  onClick={() => switchPay.mutate(m, { onSuccess: () => setChoosing(false) })}
                >
                  {t(`co.pay.${m}`)}
                  <PaymentMarks kinds={METHOD_MARKS[m] ?? []} />
                </Button>
              ))}
              {usable && (
                <Button variant="ghost" onClick={() => setChoosing(false)}>
                  {t('pay.keep')}
                </Button>
              )}
            </div>
          ) : instructions?.kind === 'qr' ? (
            <KhqrPanel number={order.number} qr={instructions.qrString} deeplink={instructions.deeplink} amountCents={amountCents} />
          ) : instructions?.kind === 'redirect' ? (
            <form method={instructions.method} action={instructions.url} onSubmit={() => rememberCardReturn(order.number)} className="flex flex-col gap-4 rounded-[16px] border border-stone p-5">
              {Object.entries(instructions.fields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-11 place-items-center rounded-full bg-stone">
                  <CreditCard className="size-5" />
                </span>
                <PaymentMarks kinds={['visa', 'mastercard']} />
              </div>
              <p className="text-[15px]">{t('pay.cardBody')}</p>
              <Button type="submit" variant="buy" size="lg" block className="rounded-[10px]">
                <Lock className="size-4" aria-hidden />
                {t('pay.continueCard')}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The KHQR card as Cambodian banking apps show it: red header with the cut corner, who you pay, how much, the code. */
function KhqrPanel({ number, qr, deeplink, amountCents }: { number: string; qr: string; deeplink: string | null; amountCents: number }) {
  const { t } = useI18n();
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toString(qr, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0E1113', light: '#FFFFFF' } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [qr]);
  const phone = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, []);
  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-4">
      <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_24px_50px_-24px_rgb(14_17_19/0.45),0_0_0_1px_rgb(14_17_19/0.06)]">
        <div className="relative grid h-[58px] place-items-center bg-[#E1232E] [clip-path:polygon(0_0,100%_0,100%_55%,calc(100%-30px)_100%,0_100%)]">
          <span className="font-sans text-[22px] font-extrabold tracking-[0.08em] text-white">KHQR</span>
        </div>
        <div className="px-6 pb-4 pt-4">
          <p className="text-[14px] font-medium text-graphite">{t('brand.name')}</p>
          <p className="tabular mt-0.5 flex items-baseline gap-1.5">
            <span className="font-display text-[34px] font-bold leading-none">{formatUsd(amountCents)}</span>
            <span className="text-sm font-semibold text-graphite">USD</span>
          </p>
        </div>
        <div aria-hidden className="mx-6 border-t-2 border-dashed border-[#E6E2D9]" />
        <div className="p-6">
          <div role="img" aria-label={t('pay.qrLabel', { number })} className="relative mx-auto aspect-square w-full max-w-[280px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}>
            {svg ? undefined : <Skeleton className="h-full w-full" />}
          </div>
        </div>
        <p className="flex items-center justify-center gap-2 bg-chalk px-4 py-3 text-center text-[13px] font-medium text-graphite">
          <ScanLine className="size-4" aria-hidden />
          {t('pay.scanAny')}
        </p>
      </div>
      {deeplink && phone && (
        <a href={deeplink} className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-cobalt font-semibold text-paper">
          {t('pay.openAba')}
        </a>
      )}
    </div>
  );
}

const HOLD_MS = 30 * 60_000;

function Countdown({ until }: { until: string }) {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, new Date(until).getTime() - now);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const pct = Math.min(100, (left / HOLD_MS) * 100);
  const low = left < 5 * 60_000;
  return (
    <div className="border-t border-paper/10 px-5 pb-5 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[14px] text-paper/80">
          <Clock3 className="size-4 shrink-0" aria-hidden />
          {t('pay.holding', { time: formatDate(until, lang, { day: undefined, month: undefined, year: undefined, hour: '2-digit', minute: '2-digit' }) })}
        </p>
        <span className={cx('tabular font-display text-2xl font-bold leading-none', low && 'text-[#FF8A8F]')} aria-hidden>
          {mm}:{String(ss).padStart(2, '0')}
        </span>
      </div>
      <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper/15">
        <div className={cx('h-full rounded-full transition-[width] duration-1000 ease-linear', low ? 'bg-vermilion' : 'bg-paper')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

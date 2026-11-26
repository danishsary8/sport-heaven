import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { isApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatKhr, formatUsd, useI18n } from '../../lib/i18n';
import { Button, EmptyState, ErrorState, QueryView, Seo, Skeleton } from '../../ui';
import { orderKey, useOrder, usePaymentStatus, useSwitchPayment, type OrderView, type Payment, type PayMethod } from '../orders/api';

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
    <section className="mx-auto max-w-[640px] px-4 pb-16 pt-6 lg:pt-10">
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
  const payment: Payment | null = switchPay.data?.payment ?? current?.latestPayment ?? initialPayment;
  const orderStatus = current?.status ?? order.status;
  const paid = (current?.paymentStatus ?? order.paymentStatus) === 'paid';
  const reservedUntil = current?.reservedUntil ?? order.reservedUntil;

  useEffect(() => {
    if (!paid) return;
    // The order page must not show the cached unpaid order.
    void qc.invalidateQueries({ queryKey: orderKey(order.number) }).then(() => navigate(`/order/${order.number}`, { replace: true }));
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

  const instructions = payment?.instructions ?? null;
  const usable = payment && payment.status === 'pending' && instructions && instructions.kind !== 'none';
  const showChooser = choosing || !usable;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-graphite">{t('pay.orderNumber', { number: order.number })}</p>
        <h1 className="mt-1 font-display text-5xl font-bold leading-none">{instructions?.kind === 'redirect' && !showChooser ? t('pay.cardTitle') : t('pay.title')}</h1>
      </div>

      <div className="rounded-[10px] border border-cobalt/30 bg-cobalt/[0.04] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-graphite">{t('pay.amount')}</span>
          <span className="text-right">
            <span className="tabular block font-display text-4xl font-bold">{formatUsd(payment?.amountCents ?? order.pricing.totalCents)}</span>
            <span className="tabular block text-sm text-graphite">{formatKhr(order.pricing.totalKhr, lang)}</span>
          </span>
        </div>
        {reservedUntil && <Countdown until={reservedUntil} />}
      </div>

      {switchPay.isError && <ErrorState message={isApiError(switchPay.error) ? switchPay.error.message : undefined} />}

      {showChooser ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('pay.choose')}</h2>
          {METHODS.map((m) => (
            <Button key={m} variant={m === 'aba_khqr' ? 'buy' : 'secondary'} size="lg" block loading={switchPay.isPending && switchPay.variables === m} onClick={() => switchPay.mutate(m, { onSuccess: () => setChoosing(false) })}>
              {t(`co.pay.${m}`)}
            </Button>
          ))}
          {usable && (
            <Button variant="ghost" onClick={() => setChoosing(false)}>
              {t('pay.keep')}
            </Button>
          )}
        </div>
      ) : instructions?.kind === 'qr' ? (
        <KhqrPanel number={order.number} qr={instructions.qrString} deeplink={instructions.deeplink} />
      ) : instructions?.kind === 'redirect' ? (
        <form method={instructions.method} action={instructions.url} className="flex flex-col gap-3">
          {Object.entries(instructions.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <p className="text-[15px]">{t('pay.cardBody')}</p>
          <Button type="submit" variant="buy" size="lg" block>
            {t('pay.continueCard')}
          </Button>
        </form>
      ) : null}

      {!showChooser && (
        <Button variant="secondary" onClick={() => setChoosing(true)}>
          {t('pay.another')}
        </Button>
      )}
      <p className="text-sm text-graphite">{t('pay.waiting')}</p>
    </div>
  );
}

function KhqrPanel({ number, qr, deeplink }: { number: string; qr: string; deeplink: string | null }) {
  const { t } = useI18n();
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toString(qr, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0E1113', light: '#FFFFFF' } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [qr]);
  const phone = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, []);
  return (
    <div className="flex flex-col items-center gap-4 rounded-[10px] bg-paper p-5 shadow-[0_0_0_1px_#EAE7DF]">
      <div className="w-full rounded-t-[8px] bg-vermilion py-2 text-center font-bold tracking-wide text-paper">KHQR</div>
      <div role="img" aria-label={t('pay.qrLabel', { number })} className="aspect-square w-[min(72vw,280px)] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}>
        {svg ? undefined : <Skeleton className="h-full w-full" />}
      </div>
      <ol className="list-decimal self-stretch pl-5 text-[15px]">
        <li>{t('pay.step1')}</li>
        <li>{t('pay.step2')}</li>
        <li>{t('pay.step3')}</li>
      </ol>
      {deeplink && phone && (
        <a href={deeplink} className="inline-flex h-12 w-full items-center justify-center rounded-[6px] bg-cobalt font-semibold text-paper">
          {t('pay.openAba')}
        </a>
      )}
    </div>
  );
}

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
  return (
    <p className="mt-3 border-t border-cobalt/20 pt-3 text-[15px] text-cobalt">
      {t('pay.holding', { time: formatDate(until, lang, { day: undefined, month: undefined, year: undefined, hour: '2-digit', minute: '2-digit' }) })}{' '}
      <span className="tabular font-semibold" aria-hidden>
        ({mm}:{String(ss).padStart(2, '0')})
      </span>
    </p>
  );
}

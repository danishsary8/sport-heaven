import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { QueryView, Sheet, Skeleton } from '../../ui';
import { useCart } from './api';
import { BagLines, BagTotals, CheckoutButton } from './BagContents';
import { EmptyBag } from './BagPage';

export function BagDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t } = useI18n();
  const cart = useCart();
  const hasLines = !!cart.data?.cart.lines.length;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="right"
      title={t('bag.title')}
      footer={
        hasLines && cart.data ? (
          <div className="flex flex-col gap-3">
            <BagTotals cart={cart.data.cart} />
            <CheckoutButton cart={cart.data.cart} onNavigate={onClose} />
            <Link to="/bag" onClick={onClose} className="text-center font-semibold underline underline-offset-4">
              {t('bag.view')}
            </Link>
          </div>
        ) : undefined
      }
    >
      <QueryView query={cart} skeleton={<Skeleton className="h-40 w-full" />} isEmpty={(d) => d.cart.lines.length === 0} empty={<EmptyBag />}>
        {({ cart: c }) => (
          <div onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>
            <BagLines cart={c} compact />
            {c.notices.map((n) => (
              <p key={n} className="mt-2 text-sm text-graphite">
                {n}
              </p>
            ))}
          </div>
        )}
      </QueryView>
    </Sheet>
  );
}

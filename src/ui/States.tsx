import { useEffect, useState, type ReactNode } from 'react';
import { isApiError } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Button } from './Button';
import { cx } from './cx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton rounded-[6px]', className)} />;
}

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="alert" className={cx('flex flex-col items-start gap-3 rounded-[8px] border border-stone bg-chalk p-5', className)}>
      <p className="text-[15px] text-obsidian">{message ?? t('common.error')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col items-start gap-2 py-10', className)}>
      <h2 className="font-display text-3xl font-bold leading-tight">{title}</h2>
      {body && <p className="max-w-prose text-graphite">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** The parts of a TanStack Query result that QueryView reads. */
export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

const SLOW_MS = 10_000;

/**
 * Loading → skeleton (and after 10 s a "still loading" note with Retry, never an endless skeleton);
 * error → the API's message with Retry; empty → `empty`; otherwise `children(data)`.
 */
export function QueryView<T>({
  query,
  skeleton,
  empty,
  isEmpty,
  children,
}: {
  query: QueryLike<T>;
  skeleton: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  const { t } = useI18n();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!query.isPending) return;
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [query.isPending]);

  if (query.isPending) {
    return (
      <div aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        {slow ? <ErrorState message={t('common.stillLoading')} onRetry={() => void query.refetch()} /> : skeleton}
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    const message = isApiError(query.error) ? query.error.message : undefined;
    return <ErrorState message={message} onRetry={() => void query.refetch()} />;
  }
  if (empty !== undefined && isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

import type { ReactNode } from 'react';
import { Seo, cx } from '../../ui';

export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <Seo title={`${title} (admin)`} noindex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-bold leading-none">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const cls = { neutral: 'bg-stone text-obsidian', good: 'bg-success/10 text-success', warn: 'bg-brass/20 text-obsidian', bad: 'bg-vermilion/10 text-vermilion', info: 'bg-cobalt/10 text-cobalt' }[tone];
  return <span className={cx('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', cls)}>{children}</span>;
}

/** "pending_payment" → "Pending payment" */
export const human = (s: string) => {
  const t = s.replaceAll('_', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const dateTime = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Phnom_Penh' }).format(new Date(iso));

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage(p: number): void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <button type="button" className="rounded-[6px] border border-[#C9C5BB] px-3 py-1.5 font-semibold disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="tabular">
        Page {page} of {pages}
      </span>
      <button type="button" className="rounded-[6px] border border-[#C9C5BB] px-3 py-1.5 font-semibold disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

const METHOD: Record<string, string> = { aba_khqr: 'ABA KHQR', card: 'Card', acleda: 'ACLEDA', wing: 'Wing', cash_on_pickup: 'Cash on pickup' };
export const methodName = (m: string) => METHOD[m] ?? human(m);

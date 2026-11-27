import { Link } from 'react-router';
import { useI18n } from '../../lib/i18n';
import { cx } from '../../ui';

export function Wordmark({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Link to="/" aria-label={t('nav.home')} className={cx('font-display text-[26px] font-extrabold uppercase leading-none tracking-[-0.01em]', className)}>
      Sport<span className="text-vermilion">·</span>Heaven
    </Link>
  );
}

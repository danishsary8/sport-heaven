import { Link } from 'react-router';
import { useI18n } from '../../../../lib/i18n';
import { SectionTitle } from '../../../../ui';

/** A home section's title with an optional "See all" link to the full listing. */
export function SectionHead({ id, title, href }: { id: string; title: string; href?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
      <SectionTitle id={id}>{title}</SectionTitle>
      {href && (
        <Link
          to={href}
          className="mb-0.5 shrink-0 text-[15px] font-semibold underline decoration-obsidian/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-obsidian"
        >
          {t('home.seeAll')}
        </Link>
      )}
    </div>
  );
}

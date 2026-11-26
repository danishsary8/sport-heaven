import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useI18n } from '../../../../lib/i18n';
import { CONTAINER, Picture } from '../../../../ui';
import type { HeroContent } from '../sections';

/**
 * The poster at the top of the home page: the headline set at nameset scale over a pitch photo.
 * The photo is darkened only where the text sits (bottom on phones, left on desktop).
 */
export function Hero({ content, priority }: { content: HeroContent; priority: boolean }) {
  const { t } = useI18n();
  const { title, subtitle, href, image } = content;
  const label = href.startsWith('/collections/new-arrivals') ? t('home.shopNew') : t('home.shopNow');
  return (
    <section className="relative isolate overflow-hidden bg-obsidian text-paper">
      <Picture src={image} alt="" sizes="100vw" priority={priority} width={1440} height={900} className="absolute inset-0 -z-20 h-full w-full" imgClassName="opacity-80" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(14_17_19/0.92)_0%,rgb(14_17_19/0.55)_45%,rgb(14_17_19/0.15)_100%)] lg:bg-[linear-gradient(100deg,rgb(14_17_19/0.9)_0%,rgb(14_17_19/0.55)_45%,rgb(14_17_19/0.05)_80%)]"
      />
      <div className={`${CONTAINER} flex min-h-[68vh] flex-col justify-end pb-10 pt-24 lg:min-h-[74vh] lg:pb-20`}>
        <span aria-hidden className="flag-rule mb-5 block h-3 w-[72px] lg:mb-7 lg:h-4 lg:w-24" />
        <h1 className="max-w-[14ch] font-display text-[clamp(56px,14vw,148px)] font-extrabold uppercase leading-[0.84] tracking-[-0.015em]">{title}</h1>
        {subtitle && <p className="mt-5 max-w-[40ch] text-lg leading-snug text-paper/90 lg:text-xl">{subtitle}</p>}
        <Link
          to={href}
          className="group mt-8 inline-flex h-13 w-fit items-center gap-2.5 rounded-[6px] bg-paper px-7 text-base font-semibold text-obsidian transition-colors hover:bg-stone focus-visible:outline-paper"
        >
          {label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

import type { DictKey } from '../../../lib/i18n';

/**
 * Campaign slides that follow the hero(es) from the API in the home carousel.
 *
 * Every image here is the shop's own product photography (public/assets). To use campaign photos of
 * players or drivers, put the files in public/assets/site and set `image`: only use photos you hold a
 * licence for. A famous athlete's face on a shop banner needs their (or their agency's) permission.
 */
export type SlideTone = 'night' | 'cobalt' | 'light';

export interface CampaignSlide {
  id: string;
  /** Dictionary keys for the copy (English and Khmer). */
  title: DictKey;
  body: DictKey;
  cta: DictKey;
  href: string;
  tone: SlideTone;
  /** A full-bleed background photo. When set, the product photos are not shown. */
  image?: string;
  /** Two or three product photos shown as cards on the right. */
  products: string[];
}

const c = (file: string) => `/assets/catalog/${file}`;

export const CAMPAIGN_SLIDES: readonly CampaignSlide[] = [
  {
    id: 'ucl',
    title: 'hero.ucl.title',
    body: 'hero.ucl.body',
    cta: 'hero.ucl.cta',
    href: '/collections/ucl-2026-27',
    tone: 'night',
    products: [c('jersey_madrid_2627_home_1795132050973.jpg'), c('ball_ucl_pro_2627_1795193989350.jpg'), c('jersey_psg_2627_home_1795132052376.jpg')],
  },
  {
    id: 'nations',
    title: 'hero.nations.title',
    body: 'hero.nations.body',
    cta: 'hero.nations.cta',
    href: '/collections/national-teams',
    tone: 'cobalt',
    products: [c('jersey_cambodia_blue_1795112605589.jpg'), c('jersey_argentina_3star_1795138746513.jpg'), c('jersey_brazil_2627_home_1795194002586.jpg')],
  },
  {
    id: 'boots',
    title: 'hero.boots.title',
    body: 'hero.boots.body',
    cta: 'hero.boots.cta',
    href: '/c/boots',
    tone: 'light',
    products: [c('boot_adidas_f50_messi_fg_1795193990192.jpg'), c('hero_mercurial_boot_1795112605976.jpg'), c('boot_predator_25_ft_1795135088584.jpg')],
  },
  {
    id: 'retro',
    title: 'hero.retro.title',
    body: 'hero.retro.body',
    cta: 'hero.retro.cta',
    href: '/collections/retro-jerseys',
    tone: 'night',
    products: [c('jersey_retro_barca_1999_1795193989766.jpg'), c('jersey_retro_brazil_2002_1795193991108.jpg')],
  },
  {
    id: 'f1',
    title: 'hero.f1.title',
    body: 'hero.f1.body',
    cta: 'hero.f1.cta',
    href: '/c/f1',
    tone: 'night',
    products: [c('jersey_f1_mclaren_2026_1795193990807.jpg'), c('jersey_f1_ferrari_white_1795193990486.jpg'), c('jersey_f1_redbull_2026_1795138745927.jpg')],
  },
];

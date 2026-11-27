import type { DictKey } from '../../../lib/i18n';

/**
 * Campaign slides for the home carousel, shown before the hero from the API.
 *
 * Photo slides: the files live in public/assets/site (run `npm run images` after adding one so the
 * WebP/AVIF sizes exist). `align` puts the text on the side away from the player, and `focus` is the
 * CSS object-position that keeps the face in frame when phones crop the photo to portrait.
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
  /** A full-bleed photo. When set, the product photos are not shown. */
  image?: string;
  /** Which side the text sits on (desktop). Defaults to the start (left). */
  align?: 'start' | 'end';
  /** object-position for the photo, e.g. "62% 25%". */
  focus?: string;
  /** Vertical text position on desktop; 'bottom' clears a raised arm or a face high in frame. */
  valign?: 'center' | 'bottom';
  /** Product photos shown as cards on slides without a photo. */
  products: string[];
}

const c = (file: string) => `/assets/catalog/${file}`;
const site = (file: string) => `/assets/site/${file}`;

export const CAMPAIGN_SLIDES: readonly CampaignSlide[] = [
  {
    id: 'nations',
    title: 'hero.nations.title',
    body: 'hero.nations.body',
    cta: 'hero.nations.cta',
    href: '/collections/national-teams',
    tone: 'night',
    image: site('hero_messi_argentina.jpg'),
    align: 'start',
    focus: '64% 22%',
    products: [],
  },
  {
    id: 'ucl',
    title: 'hero.ucl.title',
    body: 'hero.ucl.body',
    cta: 'hero.ucl.cta',
    href: '/collections/ucl-2026-27',
    tone: 'night',
    image: site('hero_ronaldo_ucl.jpg'),
    align: 'end',
    focus: '42% 30%',
    products: [],
  },
  {
    id: 'laliga',
    title: 'hero.laliga.title',
    body: 'hero.laliga.body',
    cta: 'hero.laliga.cta',
    href: '/c/jerseys?league=La+Liga',
    tone: 'night',
    image: site('hero_yamal_barca.jpg'),
    align: 'end',
    valign: 'bottom',
    focus: '38% 25%',
    products: [],
  },
  {
    id: 'brazil',
    title: 'hero.brazil.title',
    body: 'hero.brazil.body',
    cta: 'hero.brazil.cta',
    href: '/search?q=brazil',
    tone: 'night',
    image: site('hero_neymar_brazil.jpg'),
    align: 'start',
    focus: '54% 22%',
    products: [],
  },
  {
    id: 'new',
    title: 'hero.new.title',
    body: 'hero.new.body',
    cta: 'hero.new.cta',
    href: '/collections/new-arrivals',
    tone: 'night',
    image: site('hero_bellingham_england.jpg'),
    align: 'end',
    focus: '48% 25%',
    products: [],
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

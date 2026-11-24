/**
 * Main navigation. Every link is a filtered shop URL built from the same
 * facet keys the shop sidebar uses, so menus and filters always agree.
 */
import type { ShopCategory } from '../lib/shop-filters';

export type MenuKey = 'jerseys' | 'boots' | 'f1' | 'gear';

export interface MenuLink {
  label: string;
  category: ShopCategory;
  /** Filter params in URL form, e.g. `league=premier-league`. Empty = whole category. */
  params?: string;
}

export interface MenuColumn {
  title: string;
  links: MenuLink[];
}

export interface MenuSection {
  key: MenuKey;
  label: string;
  /** Link for the top-level item and the "Shop all" link. */
  all: MenuLink;
  columns: MenuColumn[];
  /** Product slug shown as the featured card. */
  featuredSlug: string;
  featuredNote: string;
}

const jersey = (label: string, params: string): MenuLink => ({ label, category: 'jerseys', params });
const boots = (label: string, params: string): MenuLink => ({ label, category: 'boots', params });
const f1 = (label: string, params: string): MenuLink => ({ label, category: 'f1', params });

export const MAIN_MENU: MenuSection[] = [
  {
    key: 'jerseys',
    label: 'Jerseys',
    all: { label: 'Shop all jerseys', category: 'jerseys' },
    columns: [
      {
        title: 'Leagues',
        links: [
          jersey('Premier League', 'league=premier-league'),
          jersey('La Liga', 'league=la-liga'),
          jersey('Serie A', 'league=serie-a'),
          jersey('Bundesliga', 'league=bundesliga'),
          jersey('Ligue 1', 'league=ligue-1'),
          jersey('Cambodian Premier League', 'league=cambodian-premier-league'),
        ],
      },
      {
        title: 'National teams',
        links: [
          jersey('Argentina', 'team=argentina-national-team'),
          jersey('Brazil', 'team=brazil-national-team'),
          jersey('France', 'team=france-national-team'),
          jersey('Spain', 'team=spain-national-team'),
          jersey('Japan', 'team=japan-national-team'),
          jersey('Cambodia', 'team=cambodia-national-team'),
          jersey('All national teams', 'team-type=national'),
        ],
      },
      {
        title: 'Shop by',
        links: [
          jersey('New season kits', 'season=2026-27,2026'),
          jersey('Retro classics', 'season=retro'),
          jersey('Champions League kits', 'only=ucl'),
          jersey('Player version', 'version=player'),
          jersey('Kids', 'fit=kids'),
          jersey('Long sleeve', 'sleeve=long'),
        ],
      },
    ],
    featuredSlug: 'real-madrid-2026-27-home-authentic-jersey',
    featuredNote: 'New season home kit',
  },
  {
    key: 'boots',
    label: 'Boots',
    all: { label: 'Shop all boots', category: 'boots' },
    columns: [
      {
        title: 'Surface',
        links: [
          boots('Firm ground (FG)', 'surface=fg'),
          boots('Artificial grass (AG)', 'surface=ag'),
          boots('Turf (TF)', 'surface=tf'),
          boots('Multi-ground (MG)', 'surface=mg'),
        ],
      },
      {
        title: 'Brands',
        links: [
          boots('Nike', 'brand=nike'),
          boots('Adidas', 'brand=adidas'),
          boots('Puma', 'brand=puma'),
          boots('Mizuno', 'brand=mizuno'),
          boots('New Balance', 'brand=new-balance'),
        ],
      },
      {
        title: 'Shop by',
        links: [
          boots('New arrivals', 'only=new'),
          boots('On sale', 'only=sale'),
        ],
      },
    ],
    featuredSlug: 'adidas-predator-25-elite-fold-over-tongue-fg',
    featuredNote: 'Fold-over tongue, firm ground',
  },
  {
    key: 'f1',
    label: 'F1',
    all: { label: 'Shop all F1', category: 'f1' },
    columns: [
      {
        title: 'Teams',
        links: [
          f1('Scuderia Ferrari', 'team=scuderia-ferrari'),
          f1('Oracle Red Bull Racing', 'team=oracle-red-bull-racing'),
          f1('Mercedes-AMG Petronas', 'team=mercedes-amg-petronas'),
          f1('McLaren', 'team=mclaren-f1-team'),
        ],
      },
      {
        title: 'Garment',
        links: [f1('Team jerseys', 'garment=jersey'), f1('Jackets', 'garment=jacket')],
      },
    ],
    featuredSlug: 'mclaren-f1-team-2026-papaya-team-jersey',
    featuredNote: '2026 team jersey',
  },
  {
    key: 'gear',
    label: 'Balls & Gear',
    all: { label: 'Shop all balls', category: 'balls' },
    columns: [
      {
        title: 'Balls',
        links: [
          { label: 'Match balls', category: 'balls', params: 'type=match-ball' },
          { label: 'Futsal balls', category: 'balls', params: 'type=futsal' },
          { label: 'All balls', category: 'balls' },
        ],
      },
      {
        title: 'Goalkeeper & gear',
        links: [
          { label: 'Goalkeeper gloves', category: 'essentials', params: 'type=gloves' },
          { label: 'Grip socks', category: 'essentials', params: 'type=socks' },
          { label: 'Shin guards', category: 'essentials', params: 'type=shin-guards' },
          { label: 'All gear', category: 'essentials' },
        ],
      },
    ],
    featuredSlug: 'adidas-uefa-champions-league-2026-27-pro-match-ball',
    featuredNote: 'Official match ball',
  },
];

/** Which top-level menu a shop category belongs to (for the active underline). */
export const CATEGORY_MENU: Record<ShopCategory, MenuKey | null> = {
  all: null,
  jerseys: 'jerseys',
  boots: 'boots',
  f1: 'f1',
  balls: 'gear',
  essentials: 'gear',
};

import { describe, expect, it } from 'vitest';
import { IMPORT_TEMPLATE, checkImport, groupPhotoFiles, parseCsv, planImport } from './productImport';

const BRANDS = [{ id: 'b1', slug: 'adidas', name: 'Adidas' }];
const CATEGORIES = [{ id: 'c1', slug: 'boots', nameI18n: { en: 'Football Boots' } }];
const HEAD = 'name,brand,category,colour,colour_hex,sizes,price,compare_at,description,main_photo,hover_photo';

describe('parseCsv', () => {
  it('reads quoted cells with commas and quotes, CRLF, a BOM and blank lines', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['1', '2'],
    ]);
  });
});

describe('checkImport', () => {
  it('turns a good row into a draft product with its sizes and photos', () => {
    const r = checkImport(`${HEAD}\nCopa Pure 3 FG,Adidas,boots,White,#FFFFFF,EU 40|EU 41,120,150,"Soft, light",catalog/copa.jpg,media/0b7e2f4c-1111-4222-8333-444455556666.png`, BRANDS, CATEGORIES);
    expect(r.problems).toEqual([]);
    expect(r.rows[0]!.body).toEqual({
      slug: 'copa-pure-3-fg',
      brandSlug: 'adidas',
      categorySlug: 'boots',
      name: { en: 'Copa Pure 3 FG' },
      description: { en: 'Soft, light' },
      status: 'draft',
      colors: [{ name: 'White', swatchHex: '#FFFFFF' }],
      variants: [
        { color: 'White', size: 'EU 40', priceCents: 12000, compareAtCents: 15000 },
        { color: 'White', size: 'EU 41', priceCents: 12000, compareAtCents: 15000 },
      ],
      images: [{ path: 'catalog/copa.jpg' }, { path: 'media/0b7e2f4c-1111-4222-8333-444455556666.png' }],
    });
  });

  it('names every problem with its line, and accepts brand and category by name', () => {
    const r = checkImport(
      `${HEAD}\nGood,adidas,Football Boots,Black,,EU 40,99.5,,,,\nBad,Fake,boots,,#12,,1x,,,/abs.jpg,\nGood,Adidas,boots,Black,,EU 40,99,,,,`,
      BRANDS,
      CATEGORIES,
    );
    expect(r.rows[0]!.problems).toEqual([]);
    expect(r.problems).toEqual([
      'Line 3: unknown brand "Fake"',
      'Line 3: colour is empty',
      'Line 3: colour code must look like #D81E2B',
      'Line 3: add at least one size',
      'Line 3: price must look like 120 or 120.50',
      'Line 3: photo paths look like catalog/name.jpg, or a link like https://…',
      'Line 4: the same product is already on line 2',
    ]);
  });

  it('catches what the server would refuse, before anything is created', () => {
    const long = 'x'.repeat(501);
    const r = checkImport(
      `${HEAD}\nCheap,Adidas,boots,Black,,EU 40,120,100,,,\nកីឡា,Adidas,boots,Black,,EU 40,90,,,,\nTwice,Adidas,boots,Black,,EU 40|EU 40,90,,,,\n${long},Adidas,boots,Black,,EU 40,90,,,,`,
      BRANDS,
      CATEGORIES,
    );
    expect(r.problems).toEqual([
      'Line 2: compare_at must be higher than the price',
      'Line 3: the name needs Latin letters or numbers for the web address',
      'Line 4: size "EU 40" is listed twice',
      'Line 5: name is longer than 500 characters',
    ]);
  });

  it('keeps accented letters readable in the web address', () => {
    const r = checkImport(`${HEAD}\nFútbol Pro,Adidas,boots,Black,,EU 40,90,,,,`, BRANDS, CATEGORIES);
    expect(r.rows[0]!.body.slug).toBe('futbol-pro');
  });

  it('refuses a file without the needed columns', () => {
    expect(checkImport('name,price\nX,1', BRANDS, CATEGORIES).problems).toEqual(['The file needs these columns: brand, category, colour, sizes']);
  });

  it('offers a template with every column', () => {
    expect(IMPORT_TEMPLATE.split('\n')[0]).toBe(HEAD);
  });
});

describe('planImport (new or update)', () => {
  const HEAD2 = `${HEAD},slug,status`;
  const existing = {
    id: 'p1',
    slug: 'copa-pure-3-fg',
    brandId: 'b1',
    categoryId: 'c1',
    nameI18n: { en: 'Copa Pure 3 FG', km: 'កូប៉ា' },
    status: 'active' as const,
    isCustomizable: false,
    updatedAt: '2026-11-27T00:00:00Z',
    shortNameI18n: null,
    descriptionI18n: { en: 'Old text', km: 'ចាស់' },
    highlights: [],
    specs: {},
    attributes: {},
    flags: {},
    heroTagline: null,
    colors: [{ id: 'col1', name: 'White', swatchHex: null, sort: 0 }],
    variants: [
      { id: 'v1', colorId: 'col1', sizeLabel: 'EU 40', sizeSort: 400, sku: 'C-40', priceCents: 12000, compareAtCents: null, status: 'active' as const },
      { id: 'v2', colorId: 'col1', sizeLabel: 'EU 41', sizeSort: 410, sku: 'C-41', priceCents: 12000, compareAtCents: null, status: 'active' as const },
    ],
    images: [
      { id: 'i1', colorId: 'col1', path: 'catalog/copa.jpg', alt: 'Copa', sort: 0 },
      { id: 'i2', colorId: null, path: 'catalog/copa-side.jpg', alt: null, sort: 1 },
      { id: 'i3', colorId: null, path: 'catalog/copa-sole.jpg', alt: null, sort: 2 },
    ],
  };

  it('marks a product that is not in the shop as new', () => {
    const { rows } = checkImport(`${HEAD}\nPredator 26 FG,Adidas,boots,Red,,EU 40,200,,,,`, BRANDS, CATEGORIES);
    expect(planImport(rows, new Map())[0]).toMatchObject({ kind: 'new' });
  });

  it('matches by the slug column, and lists exactly what will change', () => {
    const { rows, problems } = checkImport(
      `${HEAD2}\nCopa Pure 3 FG,Adidas,boots,White,,EU 40|EU 41,11.90,,,media/new-front.webp,media/new-back.webp,copa-pure-3-fg,active`,
      BRANDS,
      CATEGORIES,
    );
    expect(problems).toEqual([]);
    const [plan] = planImport(rows, new Map([['copa-pure-3-fg', existing]]));
    expect(plan).toMatchObject({ kind: 'update', productId: 'p1' });
    expect(plan!.changes).toEqual(['price $120.00 → $11.90', 'main and hover photos']);
    expect(plan!.ops).toEqual([
      { method: 'PUT', path: '/v1/admin/products/p1/prices', body: { priceCents: 1190, compareAtCents: null } },
      // The first two photos are replaced; the extra sole photo stays after them.
      { method: 'PUT', path: '/v1/admin/products/p1/images', body: { images: [{ path: 'media/new-front.webp' }, { path: 'media/new-back.webp' }, { path: 'catalog/copa-sole.jpg' }] } },
    ]);
  });

  it('says "no change" when the row matches the shop, and leaves empty cells alone', () => {
    const { rows } = checkImport(`${HEAD2}\nCopa Pure 3 FG,Adidas,boots,White,,EU 40|EU 41,120,,,,,copa-pure-3-fg,`, BRANDS, CATEGORIES);
    expect(planImport(rows, new Map([['copa-pure-3-fg', existing]]))[0]).toMatchObject({ kind: 'same', changes: [], ops: [] });
  });

  it('updates name, description and status, keeping the Khmer text', () => {
    const { rows } = checkImport(`${HEAD2}\nCopa Pure 3 Elite FG,Adidas,boots,White,,EU 40|EU 41,120,,New text,,,copa-pure-3-fg,draft`, BRANDS, CATEGORIES);
    const [plan] = planImport(rows, new Map([['copa-pure-3-fg', existing]]));
    expect(plan!.changes).toEqual(['name', 'description', 'status active → draft']);
    expect(plan!.ops).toEqual([
      {
        method: 'PATCH',
        path: '/v1/admin/products/p1',
        body: { name: { en: 'Copa Pure 3 Elite FG', km: 'កូប៉ា' }, description: { en: 'New text', km: 'ចាស់' }, status: 'draft' },
      },
    ]);
  });

  it('refuses an unknown status', () => {
    const { problems } = checkImport(`${HEAD2}\nCopa Pure 3 FG,Adidas,boots,White,,EU 40,120,,,,,copa-pure-3-fg,live`, BRANDS, CATEGORIES);
    expect(problems).toEqual(['Line 2: status must be active, draft or archived (or empty)']);
  });
});

describe('photo links in the import', () => {
  const HEAD2 = `${HEAD},slug,status`;
  it('accepts https photo links and refuses plain http ones', () => {
    const ok = checkImport(`${HEAD}\nCopa X,Adidas,boots,White,,EU 40,120,,,https://cdn.example.com/a.webp,catalog/b.jpg`, BRANDS, CATEGORIES);
    expect(ok.problems).toEqual([]);
    expect(ok.rows[0]!.photos).toEqual(['https://cdn.example.com/a.webp', 'catalog/b.jpg']);
    const bad = checkImport(`${HEAD}\nCopa X,Adidas,boots,White,,EU 40,120,,,http://cdn.example.com/a.webp,`, BRANDS, CATEGORIES);
    expect(bad.problems).toEqual(['Line 2: photo links must start with https://']);
  });
  it('says the photos will be downloaded', () => {
    const { rows } = checkImport(`${HEAD2}\nCopa X,Adidas,boots,White,,EU 40,120,,,https://cdn.example.com/a.webp,,copa-x,`, BRANDS, CATEGORIES);
    const p = { id: 'p9', slug: 'copa-x', nameI18n: { en: 'Copa X' }, descriptionI18n: null, status: 'active', colors: [], images: [], variants: [{ priceCents: 12000, compareAtCents: null }] } as unknown as Parameters<typeof planImport>[1] extends Map<string, infer P> ? P : never;
    expect(planImport(rows, new Map([['copa-x', p]]))[0]!.changes).toEqual(['main photo (downloaded from the link)']);
  });
});

describe('groupPhotoFiles', () => {
  const f = (name: string, type = 'image/webp', size = 1000) => ({ name, type, size });
  it('reads <web address>-1 as the main photo and -2 as the hover photo', () => {
    const r = groupPhotoFiles([f('ac-milan-home-1.webp'), f('AC-Milan-Home-2.JPG', 'image/jpeg'), f('copa-1.png', 'image/png')]);
    expect(r.problems).toEqual([]);
    expect(r.groups.map((g) => [g.slug, g.main?.name, g.hover?.name])).toEqual([
      ['ac-milan-home', 'ac-milan-home-1.webp', 'AC-Milan-Home-2.JPG'],
      ['copa', 'copa-1.png', undefined],
    ]);
  });
  it('names every file it cannot use', () => {
    const r = groupPhotoFiles([f('front.webp'), f('copa-1.webp'), f('copa-1.jpg', 'image/jpeg'), f('copa-2.gif', 'image/gif'), f('big-1.webp', 'image/webp', 5 * 1024 * 1024)]);
    expect(r.problems).toEqual([
      'front.webp: name it like <web address>-1.webp (main) or -2.webp (hover)',
      'copa-1.jpg: copa already has a main photo in this batch',
      'copa-2.gif: only JPG, PNG or WebP photos',
      'big-1.webp: larger than 4 MB',
    ]);
  });
});

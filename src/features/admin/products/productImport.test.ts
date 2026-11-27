import { describe, expect, it } from 'vitest';
import { IMPORT_TEMPLATE, checkImport, parseCsv } from './productImport';

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
      'Line 3: photo paths look like catalog/name.jpg',
      'Line 4: the same product is already on line 2',
    ]);
  });

  it('refuses a file without the needed columns', () => {
    expect(checkImport('name,price\nX,1', BRANDS, CATEGORIES).problems).toEqual(['The file needs these columns: brand, category, colour, sizes']);
  });

  it('offers a template with every column', () => {
    expect(IMPORT_TEMPLATE.split('\n')[0]).toBe(HEAD);
  });
});

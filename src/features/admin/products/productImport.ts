import type { Brand, Category } from '../types';

/** The columns of a new-product spreadsheet, in template order. Sizes are separated by "|" (or ";"). */
export const IMPORT_COLUMNS = ['name', 'brand', 'category', 'colour', 'colour_hex', 'sizes', 'price', 'compare_at', 'description', 'main_photo', 'hover_photo'] as const;
const REQUIRED = ['name', 'brand', 'category', 'colour', 'sizes', 'price'] as const;

export const IMPORT_TEMPLATE = `${IMPORT_COLUMNS.join(',')}
Copa Pure 3 Elite FG,Adidas,boots,White,#F4F4F4,EU 40|EU 41|EU 42,240,260,"Soft leather, light plate",catalog/copa_pure_3.jpg,catalog/copa_pure_3_side.jpg
`;

export interface CreateBody {
  slug: string;
  brandSlug: string;
  categorySlug: string;
  name: { en: string };
  description?: { en: string };
  status: 'draft';
  colors: { name: string; swatchHex?: string }[];
  variants: { color: string; size: string; priceCents: number; compareAtCents?: number }[];
  images?: { path: string }[];
}

export interface ImportRow {
  line: number;
  name: string;
  body: CreateBody;
  problems: string[];
}

/** RFC 4180-style CSV: quoted cells (with "" for a quote), commas and line breaks inside quotes, CRLF, a BOM. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cents = (v: string): number | null => {
  const t = v.trim().replace(/^\$/, '');
  return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
};

const PHOTO = /^[a-z0-9][a-z0-9/_.-]*$/;

/**
 * Checks a new-product spreadsheet against the shop's brands and categories. Every problem names its line,
 * so the file can be fixed in one go; nothing should be created while any row has a problem.
 */
export function checkImport(text: string, brands: Brand[], categories: Category[]): { rows: ImportRow[]; problems: string[] } {
  const [head, ...data] = parseCsv(text);
  if (!head) return { rows: [], problems: ['The file is empty'] };
  const cols = head.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !cols.includes(c));
  if (missing.length) return { rows: [], problems: [`The file needs these columns: ${missing.join(', ')}`] };
  const at = (r: string[], c: (typeof IMPORT_COLUMNS)[number]) => (cols.includes(c) ? (r[cols.indexOf(c)] ?? '').trim() : '');
  const findBrand = (v: string) => brands.find((b) => b.slug === v.toLowerCase() || b.name.toLowerCase() === v.toLowerCase());
  const findCategory = (v: string) => categories.find((c) => c.slug === v.toLowerCase() || c.nameI18n.en.toLowerCase() === v.toLowerCase());
  const seen = new Map<string, number>();

  const rows = data.map((r, i): ImportRow => {
    const line = i + 2;
    const problems: string[] = [];
    const name = at(r, 'name');
    const colour = at(r, 'colour');
    const hex = at(r, 'colour_hex');
    const sizes = at(r, 'sizes')
      .split(/[|;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const price = cents(at(r, 'price'));
    const compare = at(r, 'compare_at') ? cents(at(r, 'compare_at')) : undefined;
    const photos = [at(r, 'main_photo'), at(r, 'hover_photo')].filter(Boolean);
    const brand = findBrand(at(r, 'brand'));
    const category = findCategory(at(r, 'category'));
    const slug = slugify(name);

    if (!name) problems.push('name is empty');
    if (!brand) problems.push(at(r, 'brand') ? `unknown brand "${at(r, 'brand')}"` : 'brand is empty');
    if (!category) problems.push(at(r, 'category') ? `unknown category "${at(r, 'category')}"` : 'category is empty');
    if (!colour) problems.push('colour is empty');
    if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) problems.push('colour code must look like #D81E2B');
    if (sizes.length === 0) problems.push('add at least one size');
    if (price === null) problems.push('price must look like 120 or 120.50');
    if (compare === null) problems.push('compare_at must look like 150 or be empty');
    if (photos.some((p) => !PHOTO.test(p) || p.split('/').includes('..'))) problems.push('photo paths look like catalog/name.jpg');
    if (slug && seen.has(slug)) problems.push(`the same product is already on line ${seen.get(slug)}`);
    else if (slug) seen.set(slug, line);

    const body: CreateBody = {
      slug,
      brandSlug: brand?.slug ?? '',
      categorySlug: category?.slug ?? '',
      name: { en: name },
      ...(at(r, 'description') ? { description: { en: at(r, 'description') } } : {}),
      status: 'draft',
      colors: [{ name: colour, ...(hex ? { swatchHex: hex } : {}) }],
      variants: sizes.map((size) => ({ color: colour, size, priceCents: price ?? 0, ...(compare != null ? { compareAtCents: compare } : {}) })),
      ...(photos.length ? { images: photos.map((path) => ({ path })) } : {}),
    };
    return { line, name, body, problems };
  });
  return { rows, problems: rows.flatMap((r) => r.problems.map((p) => `Line ${r.line}: ${p}`)) };
}

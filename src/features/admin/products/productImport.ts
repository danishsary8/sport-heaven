import type { AdminProduct, Brand, Category } from '../types';

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
  status: ProductStatus;
  colors: { name: string; swatchHex?: string }[];
  variants: { color: string; size: string; priceCents: number; compareAtCents?: number }[];
  images?: { path: string }[];
}

type ProductStatus = 'active' | 'draft' | 'archived';
const STATUSES: ProductStatus[] = ['active', 'draft', 'archived'];

export interface ImportRow {
  line: number;
  name: string;
  body: CreateBody;
  problems: string[];
  /** The shop product this row is about: the slug column, or the web address made from the name. */
  matchSlug: string;
  /** Set only when the file says so; empty cells leave an existing product as it is. */
  status?: ProductStatus;
  description: string;
  photos: string[];
  priceCents: number;
  compareAtCents: number | null;
}

export interface ImportOp {
  method: 'PUT' | 'PATCH';
  path: string;
  body: unknown;
}

export interface ImportPlan {
  line: number;
  kind: 'new' | 'update' | 'same';
  productId?: string;
  changes: string[];
  ops: ImportOp[];
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

/** A photo cell that is a web link (downloaded by the server on import) rather than a stored path. */
export const isPhotoLink = (v: string) => /^https:\/\//i.test(v);

/**
 * Makes `photos` (main, then hover) the product's first photos; its other photos stay after them with their
 * colour and alt text. Null when the product already starts with exactly these photos.
 */
export function photosOp(p: AdminProduct, photos: string[]): ImportOp | null {
  const current = [...p.images].sort((a, b) => a.sort - b.sort);
  if (!photos.length || photos.every((path, i) => current[i]?.path === path)) return null;
  const colour = (id: string | null) => p.colors.find((c) => c.id === id)?.name;
  const rest = current.slice(photos.length).filter((c) => !photos.includes(c.path));
  return {
    method: 'PUT',
    path: `/v1/admin/products/${p.id}/images`,
    body: {
      images: [...photos.map((path) => ({ path })), ...rest.map((c) => ({ path: c.path, ...(colour(c.colorId) ? { color: colour(c.colorId) } : {}), ...(c.alt ? { alt: c.alt } : {}) }))],
    },
  };
}

export interface PhotoFile {
  name: string;
  type: string;
  size: number;
}

export interface PhotoGroup<F extends PhotoFile = PhotoFile> {
  slug: string;
  main?: F;
  hover?: F;
}

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Groups photo files by product: "<web address>-1.webp" is the main photo, "-2" the hover photo (any of
 * .jpg/.jpeg/.png/.webp, any letter case). Every file that cannot be used is named with the reason.
 */
export function groupPhotoFiles<F extends PhotoFile>(files: F[]): { groups: PhotoGroup<F>[]; problems: string[] } {
  const groups = new Map<string, PhotoGroup<F>>();
  const problems: string[] = [];
  for (const f of files) {
    const m = /^(.+)-([12])\.[a-z0-9]+$/i.exec(f.name.trim());
    if (!m) {
      problems.push(`${f.name}: name it like <web address>-1.webp (main) or -2.webp (hover)`);
      continue;
    }
    if (!PHOTO_TYPES.includes(f.type)) {
      problems.push(`${f.name}: only JPG, PNG or WebP photos`);
      continue;
    }
    if (f.size > PHOTO_MAX_BYTES) {
      problems.push(`${f.name}: larger than 4 MB`);
      continue;
    }
    const slug = m[1]!.toLowerCase();
    const key = m[2] === '1' ? 'main' : 'hover';
    const g = groups.get(slug) ?? { slug };
    if (g[key]) {
      problems.push(`${f.name}: ${slug} already has a ${key === 'main' ? 'main' : 'hover'} photo in this batch`);
      continue;
    }
    g[key] = f;
    groups.set(slug, g);
  }
  return { groups: [...groups.values()], problems };
}

/**
 * Decides, per row, whether it adds a product or updates one already in the shop (found by its web address),
 * and lists what an update changes. For existing products, price and "was" price apply to every size; the
 * main and hover photos replace the first two (extra photos stay); empty name/description/status/photo cells
 * leave those as they are. Sizes, colours, brand and category of existing products are not changed.
 */
export function planImport(rows: ImportRow[], existing: Map<string, AdminProduct>): ImportPlan[] {
  return rows.map((r): ImportPlan => {
    const p = existing.get(r.matchSlug);
    if (!p) return { line: r.line, kind: 'new', changes: [`${r.body.variants.length} ${r.body.variants.length === 1 ? 'size' : 'sizes'}`], ops: [] };
    const changes: string[] = [];
    const ops: ImportOp[] = [];
    if (p.variants.some((v) => v.priceCents !== r.priceCents || v.compareAtCents !== r.compareAtCents)) {
      const prices = p.variants.map((v) => v.priceCents);
      const lo = Math.min(...prices);
      const hi = Math.max(...prices);
      const was = lo === hi ? usd(lo) : `${usd(lo)}–${usd(hi)}`;
      changes.push(lo === r.priceCents && hi === r.priceCents ? `"was" price ${r.compareAtCents === null ? 'removed' : `→ ${usd(r.compareAtCents)}`}` : `price ${was} → ${usd(r.priceCents)}`);
      ops.push({ method: 'PUT', path: `/v1/admin/products/${p.id}/prices`, body: { priceCents: r.priceCents, compareAtCents: r.compareAtCents } });
    }
    const photoOp = photosOp(p, r.photos);
    if (photoOp) {
      const links = r.photos.filter(isPhotoLink).length;
      changes.push(`${r.photos.length === 1 ? 'main photo' : 'main and hover photos'}${links ? ` (downloaded from the ${links === 1 ? 'link' : 'links'})` : ''}`);
      ops.push(photoOp);
    }
    const patch: Record<string, unknown> = {};
    if (r.name && r.name !== p.nameI18n.en) {
      patch.name = { ...p.nameI18n, en: r.name };
      changes.push('name');
    }
    if (r.description && r.description !== p.descriptionI18n?.en) {
      patch.description = { ...(p.descriptionI18n ?? {}), en: r.description };
      changes.push('description');
    }
    if (r.status && r.status !== p.status) {
      patch.status = r.status;
      changes.push(`status ${p.status} → ${r.status}`);
    }
    if (Object.keys(patch).length) ops.push({ method: 'PATCH', path: `/v1/admin/products/${p.id}`, body: patch });
    return { line: r.line, kind: changes.length ? 'update' : 'same', productId: p.id, changes, ops };
  });
}

/** RFC 4180-style CSV: quoted cells (with "" for a quote), commas and line breaks inside quotes, CRLF, a BOM. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
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
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cents = (v: string): number | null => {
  const t = v.trim().replace(/^\$/, '');
  return /^\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
};

const PHOTO = /^[a-z0-9][a-z0-9/_.-]*$/;
const validLink = (v: string) => {
  try {
    return new URL(v).protocol === 'https:' && v.length <= 2000;
  } catch {
    return false;
  }
};

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
    const cellOf = (c: string) => (cols.includes(c) ? (r[cols.indexOf(c)] ?? '').trim().toLowerCase() : '');
    const matchSlug = cellOf('slug') || slug;
    const statusCell = cellOf('status') as ProductStatus | '';
    const status = statusCell && STATUSES.includes(statusCell) ? statusCell : undefined;

    const description = at(r, 'description');
    if (!name) problems.push('name is empty');
    else if (name.length > 500) problems.push('name is longer than 500 characters');
    else if (slug.length < 2) problems.push('the name needs Latin letters or numbers for the web address');
    if (!brand) problems.push(at(r, 'brand') ? `unknown brand "${at(r, 'brand')}"` : 'brand is empty');
    if (!category) problems.push(at(r, 'category') ? `unknown category "${at(r, 'category')}"` : 'category is empty');
    if (!colour) problems.push('colour is empty');
    else if (colour.length > 80) problems.push('colour is longer than 80 characters');
    if (hex && !/^#[0-9a-fA-F]{6}$/.test(hex)) problems.push('colour code must look like #D81E2B');
    if (sizes.length === 0) problems.push('add at least one size');
    const twice = sizes.find((x, j) => sizes.indexOf(x) !== j);
    if (twice) problems.push(`size "${twice}" is listed twice`);
    if (sizes.some((x) => x.length > 40)) problems.push('a size is longer than 40 characters');
    if (price === null) problems.push('price must look like 120 or 120.50');
    if (compare === null) problems.push('compare_at must look like 150 or be empty');
    else if (compare !== undefined && price !== null && compare <= price) problems.push('compare_at must be higher than the price');
    if (description.length > 500) problems.push('description is longer than 500 characters');
    if (photos.some((p) => /^http:\/\//i.test(p))) problems.push('photo links must start with https://');
    else if (photos.some((p) => (isPhotoLink(p) ? !validLink(p) : !PHOTO.test(p) || p.split('/').includes('..')))) problems.push('photo paths look like catalog/name.jpg, or a link like https://…');
    if (statusCell && !status) problems.push('status must be active, draft or archived (or empty)');
    if (matchSlug.length >= 2 && seen.has(matchSlug)) problems.push(`the same product is already on line ${seen.get(matchSlug)}`);
    else if (matchSlug.length >= 2) seen.set(matchSlug, line);

    const body: CreateBody = {
      slug,
      brandSlug: brand?.slug ?? '',
      categorySlug: category?.slug ?? '',
      name: { en: name },
      ...(description ? { description: { en: description } } : {}),
      status: status ?? 'draft',
      colors: [{ name: colour, ...(hex ? { swatchHex: hex } : {}) }],
      variants: sizes.map((size) => ({ color: colour, size, priceCents: price ?? 0, ...(compare != null ? { compareAtCents: compare } : {}) })),
      ...(photos.length ? { images: photos.map((path) => ({ path })) } : {}),
    };
    return { line, name, body, problems, matchSlug, ...(status ? { status } : {}), description, photos, priceCents: price ?? 0, compareAtCents: compare ?? null };
  });
  return { rows, problems: rows.flatMap((r) => r.problems.map((p) => `Line ${r.line}: ${p}`)) };
}

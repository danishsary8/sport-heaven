import { ArrowLeft, ArrowRight, ArrowLeftRight, ImagePlus, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type Dispatch, type DragEvent, type ReactNode, type SetStateAction } from 'react';
import { apiFetch, isApiError } from '../../../lib/api';
import { Button, cx, useToast } from '../../../ui';
import { useAdminMutation, put } from '../api';
import type { AdminProduct } from '../types';

export interface PhotoTile {
  key: string;
  path: string | null;
  url: string;
  colorId: string | null;
  alt: string | null;
  uploading?: boolean;
}

const OK_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 4 * 1024 * 1024;

export const tilesOf = (product: AdminProduct): PhotoTile[] =>
  product.images.map((i) => ({ key: i.id, path: i.path, url: i.url ?? `/assets/${i.path}`, colorId: i.colorId, alt: i.alt }));

const signature = (tiles: PhotoTile[]) => JSON.stringify(tiles.map((t) => [t.path, t.colorId]));

/**
 * The product's photos as the shop uses them: the first is the main photo, the second is the pose shown when a
 * shopper hovers the card. Upload (pick or drop files), swap, reorder, set the colour, remove, then save once.
 */
export function PhotoManager({ product, tiles, onChange }: { product: AdminProduct; tiles: PhotoTile[]; onChange: Dispatch<SetStateAction<PhotoTile[]>> }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  // Compared with the saved photos, so after a save (and the product reloading) nothing shows as unsaved.
  const initial = signature(tilesOf(product));
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const update = (fn: (t: PhotoTile[]) => PhotoTile[]) => onChange(fn);
  const save = useAdminMutation((body: unknown) => put(`/v1/admin/products/${product.id}/images`, body), [['product', product.id], ['products']]);
  const dirty = signature(tiles) !== initial;
  const uploading = tiles.some((t) => t.uploading);
  const colorName = (id: string | null) => product.colors.find((c) => c.id === id)?.name;

  const addFiles = (files: FileList | File[] | null) => {
    setProblem(null);
    for (const file of Array.from(files ?? [])) {
      if (!OK_TYPES.has(file.type)) {
        setProblem(`${file.name} is not a JPG, PNG or WebP photo.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setProblem(`${file.name} is bigger than 4 MB. Save it smaller and try again.`);
        continue;
      }
      const key = `new-${Math.random().toString(36).slice(2)}`;
      const preview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
      update((t) => [...t, { key, path: null, url: preview, colorId: null, alt: null, uploading: true }]);
      apiFetch<{ path: string; url: string }>('/v1/admin/media', { method: 'POST', blob: file }).then(
        (r) => update((t) => t.map((x) => (x.key === key ? { ...x, path: r.path, url: r.url || preview, uploading: false } : x))),
        (e: unknown) => {
          update((t) => t.filter((x) => x.key !== key));
          setProblem(`${file.name} did not upload: ${isApiError(e) ? e.message : 'try again'}.`);
        },
      );
    }
    if (input.current) input.current.value = '';
  };

  const move = (from: number, to: number) =>
    update((t) => {
      if (to < 0 || to >= t.length) return t;
      const n = [...t];
      [n[from], n[to]] = [n[to]!, n[from]!];
      return n;
    });

  const submit = () =>
    save.mutate(
      {
        images: tiles
          .filter((t) => t.path)
          .map((t) => ({ path: t.path!, ...(colorName(t.colorId) ? { color: colorName(t.colorId) } : {}), ...(t.alt ? { alt: t.alt } : {}) })),
      },
      { onSuccess: () => toast.success('Photos saved'), onError: (e) => setProblem(isApiError(e) ? e.message : 'The photos were not saved.') },
    );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const tileTools = (i: number) => (
    <div className="flex items-center gap-1">
      {i === 1 && (
        <IconButton label="Swap with main photo" onClick={() => move(1, 0)}>
          <ArrowLeftRight />
        </IconButton>
      )}
      {i > 1 && (
        <IconButton label="Move earlier" onClick={() => move(i, i - 1)}>
          <ArrowLeft />
        </IconButton>
      )}
      {i > 0 && i < tiles.length - 1 && i !== 1 && (
        <IconButton label="Move later" onClick={() => move(i, i + 1)}>
          <ArrowRight />
        </IconButton>
      )}
      <IconButton label="Remove photo" onClick={() => update((t) => t.filter((_, j) => j !== i))}>
        <Trash2 />
      </IconButton>
    </div>
  );

  const tile = (t: PhotoTile, i: number) => (
    <div className="flex flex-col gap-2">
      <div className="stage relative aspect-[3/4] overflow-hidden rounded-[12px]">
        {t.url && <img src={t.url} alt={t.alt ?? ''} className={cx('size-full object-cover transition-opacity', t.uploading && 'opacity-50')} />}
        {t.uploading && (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-2 rounded-full bg-paper/90 py-1 text-xs font-semibold">
            <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-r-transparent" />
            Uploading
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {product.colors.length > 1 ? (
          <select
            aria-label={`Colour for photo ${i + 1}`}
            value={t.colorId ?? ''}
            onChange={(e) => update((all) => all.map((x) => (x.key === t.key ? { ...x, colorId: e.target.value || null } : x)))}
            className="h-8 min-w-0 flex-1 rounded-full border border-[#D6D2C8] bg-paper px-2 text-xs"
          >
            <option value="">All colours</option>
            {product.colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate text-xs text-graphite">{colorName(t.colorId) ?? 'All colours'}</span>
        )}
        {tileTools(i)}
      </div>
    </div>
  );

  const [main, hover, ...rest] = tiles;
  return (
    <section
      aria-labelledby="photos-h"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cx('rounded-[16px] border p-5 transition-colors', dragging ? 'border-cobalt bg-cobalt/[0.04]' : 'border-stone')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="photos-h" className="font-display text-[28px] font-bold leading-none">
            Photos
          </h2>
          <p className="mt-1 text-sm text-graphite">The first photo is what shoppers see. The second shows when they point at the card, so use a different pose (back or side).</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-obsidian px-4 text-sm font-semibold transition-colors hover:bg-stone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-obsidian">
          <Upload className="size-4" aria-hidden />
          Add photos
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
        <Slot label="Main photo">{main ? tile(main, 0) : <EmptySlot text="Add the main photo" onPick={() => input.current?.click()} />}</Slot>
        <Slot label="Hover photo (second pose)">{hover ? tile(hover, 1) : <EmptySlot text="Add the second pose" onPick={() => input.current?.click()} />}</Slot>
        {rest.map((t, j) => (
          <Slot key={t.key} label={`Photo ${j + 3}`}>
            {tile(t, j + 2)}
          </Slot>
        ))}
      </div>

      {problem && (
        <p role="alert" className="mt-4 rounded-[10px] bg-vermilion/[0.07] px-3 py-2 text-sm font-medium text-vermilion">
          {problem}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="primary" loading={save.isPending} disabled={uploading || !dirty} onClick={submit}>
          Save photos
        </Button>
        <span className="text-sm text-graphite">{uploading ? 'Waiting for uploads to finish.' : dirty ? 'Unsaved changes.' : 'Saved. Drop photos anywhere on this box to add more.'}</span>
      </div>
    </section>
  );
}

function Slot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}

function EmptySlot({ text, onPick }: { text: string; onPick(): void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-[#C9C5BB] p-3 text-center text-sm font-medium text-graphite transition-colors hover:border-obsidian hover:text-obsidian"
    >
      <ImagePlus className="size-6" aria-hidden />
      {text}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-8 place-items-center rounded-full text-graphite transition-colors hover:bg-stone hover:text-obsidian [&>svg]:size-4">
      {children}
    </button>
  );
}

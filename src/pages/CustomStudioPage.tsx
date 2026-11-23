import { useState } from 'react';
import { Plus, ShoppingBag, Trash2, Users } from 'lucide-react';
import { PRODUCTS } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import type { JerseyFontStyle, JerseyPatchId } from '../types/store';
import {
  formatKhr,
  formatUsd,
  getCartItemUnitPrice,
  PATCH_OPTIONS,
  sanitizePlayerName,
  sanitizeSquadNumber,
} from '../utils/commerce';
import { JerseyPreviewSvg, ProductMedia } from '../components/product';

interface SquadEntry {
  id: string;
  size: string;
  playerName: string;
  squadNumber: string;
}

interface CustomStudioPageProps {
  initialSlug?: string;
}

export function CustomStudioPage({ initialSlug }: CustomStudioPageProps) {
  const { addToCart, pushToast, setCartOpen } = useStore();
  const printableKits = PRODUCTS.filter((p) => p.customizable && p.jerseyTheme);

  const initialProduct =
    printableKits.find((p) => p.slug === initialSlug) ?? printableKits[0];

  const [selectedId, setSelectedId] = useState(initialProduct.id);
  const [size, setSize] = useState('L');
  const [playerName, setPlayerName] = useState(
    initialProduct.category === 'f1' ? 'LECLERC' : 'VATHANAKA',
  );
  const [squadNumber, setSquadNumber] = useState(
    initialProduct.category === 'f1' ? '16' : '11',
  );
  const [patch, setPatch] = useState<JerseyPatchId>(
    initialProduct.category === 'f1'
      ? 'f1-paddock'
      : initialProduct.isChampionsLeague
        ? 'ucl'
        : 'cpl',
  );
  const [fontStyle, setFontStyle] = useState<JerseyFontStyle>(
    initialProduct.category === 'f1' ? 'motorsport-aero' : 'pro-condensed',
  );
  const [mode, setMode] = useState<'single' | 'team'>('single');
  const [squadRoster, setSquadRoster] = useState<SquadEntry[]>([
    { id: 'sq-1', size: 'M', playerName: 'SOKHA', squadNumber: '7' },
    { id: 'sq-2', size: 'L', playerName: 'VIREAK', squadNumber: '10' },
    { id: 'sq-3', size: 'L', playerName: 'DARA', squadNumber: '11' },
    { id: 'sq-4', size: 'XL', playerName: 'RITHY', squadNumber: '1' },
    { id: 'sq-5', size: 'M', playerName: 'NARA', squadNumber: '8' },
  ]);

  const product =
    printableKits.find((p) => p.id === selectedId) ?? printableKits[0];

  const printConfig = {
    enabled: true,
    playerName: sanitizePlayerName(playerName),
    squadNumber: sanitizeSquadNumber(squadNumber),
    patch,
    fontStyle,
  };

  const unitPrice = getCartItemUnitPrice(product.price, printConfig);
  const teamRawTotal = unitPrice * squadRoster.length;
  const teamQualifies = squadRoster.length >= 5;
  const teamFinalTotal = teamQualifies
    ? Number((teamRawTotal * 0.9).toFixed(2))
    : teamRawTotal;

  const handleSelectKit = (id: string) => {
    setSelectedId(id);
    const next = printableKits.find((p) => p.id === id);
    if (next?.category === 'f1') {
      setFontStyle('motorsport-aero');
      setPatch('f1-paddock');
    } else if (next?.isChampionsLeague) {
      setFontStyle('pro-condensed');
      setPatch('ucl');
    } else {
      setFontStyle('pro-condensed');
      if (patch === 'f1-paddock' || patch === 'ucl') setPatch('cpl');
    }
  };

  const handleAddSingle = () => {
    addToCart(product, size, 1, printConfig, true);
  };

  const handleAddSquadRow = () => {
    setSquadRoster((prev) => [
      ...prev,
      {
        id: `sq-${Date.now()}`,
        size: 'L',
        playerName: '',
        squadNumber: String(Math.min(99, prev.length + 12)),
      },
    ]);
  };

  const handleUpdateSquadRow = (
    id: string,
    field: keyof Omit<SquadEntry, 'id'>,
    value: string,
  ) => {
    setSquadRoster((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === 'playerName'
                  ? sanitizePlayerName(value)
                  : field === 'squadNumber'
                    ? sanitizeSquadNumber(value)
                    : value,
            }
          : row,
      ),
    );
  };

  const handleAddEntireSquad = () => {
    if (squadRoster.length === 0) return;
    squadRoster.forEach((entry) => {
      addToCart(
        product,
        entry.size,
        1,
        {
          enabled: true,
          playerName: entry.playerName || 'PLAYER',
          squadNumber: entry.squadNumber || '10',
          patch,
          fontStyle,
        },
        false,
      );
    });
    pushToast(
      `Added ${squadRoster.length} custom ${product.shortName} kits to bag`,
    );
    setCartOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#18222D]/10 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#032EA1]">
            Same-Day Phnom Penh Heat-Press Lab
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#18222D]">
            Custom Jersey &amp; F1 Printing Studio
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#56616A]">
            Design your official Cambodia national kit, CPL club jersey, European match shirt, or 2026 F1 team jersey with live preview. Order 5+ kits for automatic 10% team savings.
          </p>
        </div>

        {/* Single vs Team Batch Mode Switch */}
        <div className="inline-flex rounded-lg bg-[#E8EDF2] p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'single'
                ? 'bg-white text-[#18222D] shadow-sm'
                : 'text-[#56616A] hover:text-[#18222D]'
            }`}
          >
            Single Player Kit
          </button>
          <button
            type="button"
            onClick={() => setMode('team')}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              mode === 'team'
                ? 'bg-white text-[#18222D] shadow-sm'
                : 'text-[#56616A] hover:text-[#18222D]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team Squad Batch (-10%)</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Studio Stage */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* LIVE VISUALIZER STAGE */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 rounded-2xl border border-[#18222D]/10 bg-[#DFE5EB] p-6 sm:p-10">
          <div className="flex items-center justify-between text-xs text-[#56616A] mb-4">
            <span className="font-semibold uppercase tracking-[0.1em] text-[#18222D]">
              {product.shortName} · Back Print Live Preview
            </span>
            <span className="font-mono">{product.colorway}</span>
          </div>

          <div className="mx-auto max-w-[340px]">
            <JerseyPreviewSvg
              theme={product.jerseyTheme!}
              playerName={
                mode === 'team'
                  ? squadRoster[0]?.playerName || 'CAPTAIN'
                  : playerName || 'YOUR NAME'
              }
              squadNumber={
                mode === 'team'
                  ? squadRoster[0]?.squadNumber || '10'
                  : squadNumber || '10'
              }
              patch={patch}
              fontStyle={fontStyle}
              showPrint={true}
            />
          </div>

          {/* Front Studio Reference Card */}
          <div className="mt-6 flex items-center gap-4 rounded-xl bg-white/90 p-3.5 border border-[#18222D]/8">
            <ProductMedia
              product={product}
              className="h-16 w-20 shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]">
                Selected Base Jersey · {product.brand}
              </p>
              <p className="truncate text-sm font-bold text-[#18222D]">
                {product.name}
              </p>
              <p className="font-mono text-xs text-[#56616A]">
                Base {formatUsd(product.price)} + Print {formatUsd(unitPrice - product.price)} ={' '}
                <strong className="text-[#18222D]">{formatUsd(unitPrice)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* CONFIGURATION WORKBENCH */}
        <div className="lg:col-span-6 space-y-6">
          {/* Step 1: Choose Football or F1 Base Jersey */}
          <div className="rounded-xl border border-[#18222D]/10 bg-white p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
              01. Choose Football or F1 Jersey ({printableKits.length} Kits)
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {printableKits.map((kit) => {
                const active = kit.id === product.id;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => handleSelectKit(kit.id)}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#18222D] bg-[#F5F7F8]'
                        : 'border-[#18222D]/10 hover:border-[#18222D]/40'
                    }`}
                  >
                    <ProductMedia
                      product={kit}
                      className="h-12 w-12 shrink-0 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#18222D]">
                        {kit.shortName}
                      </p>
                      <p className="truncate text-[11px] text-[#56616A]">
                        {kit.league ?? (kit.category === 'f1' ? 'F1 Motorsport' : kit.brand)} ·{' '}
                        <span className="font-mono">{formatUsd(kit.price)}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Typography & Sleeve Patch */}
          <div className="rounded-xl border border-[#18222D]/10 bg-white p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
              02. Vinyl Font Style &amp; Official Sleeve Patch
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['pro-condensed', 'CPL / Pro'],
                  ['classic-block', 'Classic Block'],
                  ['motorsport-aero', 'F1 Aero Italic'],
                ] as Array<[JerseyFontStyle, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFontStyle(key)}
                  className={`h-10 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                    fontStyle === key
                      ? 'border-[#18222D] bg-[#18222D] text-white'
                      : 'border-[#18222D]/15 text-[#18222D] hover:border-[#18222D]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="studio-patch-select"
                className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
              >
                Sleeve Patch
              </label>
              <select
                id="studio-patch-select"
                value={patch}
                onChange={(e) => setPatch(e.target.value as JerseyPatchId)}
                className="mt-1.5 h-10 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 text-xs font-medium text-[#18222D]"
              >
                {PATCH_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} {opt.fee > 0 ? `(+${formatUsd(opt.fee)})` : '(No charge)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Single Player OR Team Roster Inputs */}
          {mode === 'single' ? (
            <div className="rounded-xl border border-[#18222D]/10 bg-white p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
                03. Player Name, Number &amp; Size
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="studio-player-name"
                    className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                  >
                    Name on Back (Max 14 chars)
                  </label>
                  <input
                    id="studio-player-name"
                    type="text"
                    maxLength={14}
                    value={playerName}
                    onChange={(e) => setPlayerName(sanitizePlayerName(e.target.value))}
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-sm font-semibold uppercase text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="studio-player-number"
                    className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]"
                  >
                    Number (1–99)
                  </label>
                  <input
                    id="studio-player-number"
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={squadNumber}
                    onChange={(e) => setSquadNumber(sanitizeSquadNumber(e.target.value))}
                    className="mt-1.5 h-11 w-full rounded-md border border-[#18222D]/20 bg-[#F5F7F8] px-3 font-mono text-sm font-semibold text-[#18222D] focus:border-[#18222D] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#56616A]">
                  Jersey Size
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`h-10 min-w-[48px] rounded-md border px-3 font-mono text-xs font-semibold cursor-pointer ${
                        size === s
                          ? 'border-[#18222D] bg-[#18222D] text-white'
                          : 'border-[#18222D]/15 text-[#18222D] hover:border-[#18222D]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#18222D]/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xl font-bold tabular-nums text-[#18222D]">
                    {formatUsd(unitPrice)}
                  </p>
                  <p className="font-mono text-[11px] text-[#56616A]">
                    ≈ {formatKhr(unitPrice)} · Ready same day
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSingle}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#18222D] px-6 text-sm font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add Custom Jersey to Bag</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#18222D]/10 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#18222D]">
                    03. Phnom Penh Squad Roster ({squadRoster.length} Kits)
                  </h2>
                  <p className="text-[11px] text-[#56616A]">
                    {teamQualifies
                      ? '10% Team Bulk Discount active on this squad order'
                      : `Add ${5 - squadRoster.length} more kits to unlock 10% team savings`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSquadRow}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#18222D] px-3 text-xs font-semibold text-[#18222D] hover:bg-[#18222D] hover:text-white cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Player</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {squadRoster.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg bg-[#F5F7F8] p-2"
                  >
                    <input
                      type="text"
                      maxLength={14}
                      value={row.playerName}
                      onChange={(e) =>
                        handleUpdateSquadRow(row.id, 'playerName', e.target.value)
                      }
                      placeholder="PLAYER NAME"
                      aria-label="Squad player name"
                      className="col-span-5 h-9 rounded border border-[#18222D]/15 bg-white px-2.5 font-mono text-xs uppercase"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={row.squadNumber}
                      onChange={(e) =>
                        handleUpdateSquadRow(row.id, 'squadNumber', e.target.value)
                      }
                      placeholder="#"
                      aria-label="Squad player number"
                      className="col-span-3 h-9 rounded border border-[#18222D]/15 bg-white px-2.5 font-mono text-xs"
                    />
                    <select
                      value={row.size}
                      onChange={(e) =>
                        handleUpdateSquadRow(row.id, 'size', e.target.value)
                      }
                      aria-label="Squad player size"
                      className="col-span-3 h-9 rounded border border-[#18222D]/15 bg-white px-2 font-mono text-xs"
                    >
                      {product.sizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setSquadRoster((prev) => prev.filter((r) => r.id !== row.id))
                      }
                      aria-label="Remove squad player"
                      className="col-span-1 inline-flex h-9 items-center justify-center text-[#56616A] hover:text-[#D81E2B] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#18222D]/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl font-bold tabular-nums text-[#18222D]">
                      {formatUsd(teamFinalTotal)}
                    </span>
                    {teamQualifies && (
                      <span className="font-mono text-xs line-through text-[#56616A]">
                        {formatUsd(teamRawTotal)}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-[#56616A]">
                    ≈ {formatKhr(teamFinalTotal)} · Free Phnom Penh Express Delivery
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEntireSquad}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#18222D] px-6 text-sm font-semibold text-white hover:bg-[#0B0D10] cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add All {squadRoster.length} Kits to Bag</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

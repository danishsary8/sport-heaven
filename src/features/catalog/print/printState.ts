/** The print studio's state and its checks, kept apart from the UI so they can be tested on their own. */

import type { JerseyFontStyle, JerseyPatchId } from './types';

const NAME_RE = /^[A-Z .'-]+$/;

export interface PrintChoice {
  name: string;
  number: number;
  patch: JerseyPatchId;
  font: JerseyFontStyle;
}

/** What the shopper typed, kept as text so half-typed values stay on screen. */
export interface PrintState {
  on: boolean;
  name: string;
  number: string;
  patch: JerseyPatchId;
  font: JerseyFontStyle;
}

export const EMPTY_PRINT: PrintState = { on: false, name: '', number: '', patch: 'none', font: 'pro-condensed' };

/** Which print fields are wrong, using the limits from the API when known. */
export function printErrors(s: PrintState, max = 14, min = 1, maxNum = 99): { name?: 'nameRequired' | 'nameLong' | 'nameChars'; number?: 'number' } {
  const name = s.name.trim();
  const n = Number(s.number);
  return {
    name: !name ? 'nameRequired' : name.length > max ? 'nameLong' : !NAME_RE.test(name) ? 'nameChars' : undefined,
    number: !/^\d+$/.test(s.number) || n < min || n > maxNum ? 'number' : undefined,
  };
}

/** The print to send with Add to bag: null when printing is off; 'invalid' while the fields are wrong. */
export function printChoice(s: PrintState): PrintChoice | null | 'invalid' {
  if (!s.on) return null;
  const e = printErrors(s);
  if (e.name || e.number) return 'invalid';
  return { name: s.name.trim(), number: Number(s.number), patch: s.patch, font: s.font };
}

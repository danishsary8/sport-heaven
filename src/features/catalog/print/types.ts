/** Patches the backend prices in `custom_print_fees` (keep in sync with the API's print options). */
export type JerseyPatchId = 'none' | 'ucl' | 'cpl' | 'aff' | 'champions' | 'f1-paddock';
export type JerseyFontStyle = 'pro-condensed' | 'classic-block' | 'motorsport-aero';

export interface JerseyVisualTheme {
  primary: string;
  secondary: string;
  trim: string;
  text: string;
  pattern: 'solid' | 'stripes' | 'sash' | 'angkor' | 'racing';
  crestLabel: string;
}

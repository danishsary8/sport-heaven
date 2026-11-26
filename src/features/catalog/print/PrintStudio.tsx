export interface PrintChoice {
  name: string;
  number: number;
  patch: 'none' | 'ucl' | 'cpl' | 'aff' | 'champions' | 'f1-paddock';
  font: 'pro-condensed' | 'classic-block' | 'motorsport-aero';
}

/** Name and number printing (built in task B5). */
export function PrintStudio(props: { value: PrintChoice | null; onChange(v: PrintChoice | null): void; productName: string }) {
  void props;
  return null;
}

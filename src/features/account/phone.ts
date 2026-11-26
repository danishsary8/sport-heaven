/** "012 345 678" → "+85512345678"; numbers starting with + are kept as they are. */
export function toE164(input: string): string | null {
  const d = input.replace(/[\s()-]/g, '');
  if (/^\+\d{8,15}$/.test(d)) return d;
  if (/^855\d{8,9}$/.test(d)) return `+${d}`;
  if (/^0\d{8,9}$/.test(d)) return `+855${d.slice(1)}`;
  if (/^[1-9]\d{7,8}$/.test(d)) return `+855${d}`;
  return null;
}

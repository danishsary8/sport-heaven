import type { Branch } from '../catalog/api';

/** A Google Maps search link for a store: exact coordinates when known, else its name and address. */
export function mapsUrl(b: Branch): string {
  const q = b.lat != null && b.lng != null ? `${b.lat},${b.lng}` : `${b.name}, ${b.address}, Phnom Penh`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

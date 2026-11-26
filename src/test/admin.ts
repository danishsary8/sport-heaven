import { http, HttpResponse } from 'msw';
import { MEMBER, cart, sessionFor } from './fixtures';
import { API } from './msw';

/** Handlers every admin test needs: a session with the given role, an empty bag, the branches. */
export function adminBase(role: 'customer' | 'staff' | 'admin', staffBranchId: string | null = role === 'staff' ? 'sensok' : null) {
  return [
    http.post(`${API}/v1/auth/session`, () => HttpResponse.json(sessionFor({ ...MEMBER, role, staffBranchId }))),
    http.get(`${API}/v1/cart`, () => HttpResponse.json(cart([]))),
    http.get(`${API}/v1/branches`, () =>
      HttpResponse.json({
        branches: [
          { id: 'sensok', name: 'Sen Sok Pitch Hub', shortName: 'Sen Sok', address: '', district: '', phone: '', telegram: null, hours: '', landmarks: null, lat: null, lng: null, pickupEnabled: true },
          { id: 'sonthormuk', name: 'Sonthormuk Flagship', shortName: 'Sonthormuk', address: '', district: '', phone: '', telegram: null, hours: '', landmarks: null, lat: null, lng: null, pickupEnabled: true },
        ],
      }),
    ),
    http.get(`${API}/v1/catalog/menu`, () => HttpResponse.json({ categories: [], brands: [], collections: [] })),
  ];
}

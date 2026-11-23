import QRCode from 'qrcode';

export type OrderQrMode = 'tracking-link' | 'order-id';

export interface OrderQrMatrixData {
  payload: string;
  size: number;
  margin: number;
  viewBoxSize: number;
  svgPath: string;
  modules: boolean[][];
}

/**
 * Normalizes an order ID by trimming whitespace, stripping a leading `#`, and uppercasing.
 */
export function normalizeOrderIdForQr(orderId: string): string {
  return orderId.trim().replace(/^#+/, '').toUpperCase();
}

/**
 * Builds the canonical mobile deep-link URL pointing directly to `/pages/track-order`
 * with `order` (and optional `email`) query params so scanning immediately loads the shipment timeline.
 */
export function buildMobileTrackingUrl(
  origin: string,
  pathname: string,
  orderId: string,
  email?: string,
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : '';
  const cleanOrderId = normalizeOrderIdForQr(orderId);
  const cleanEmail = (email ?? '').trim();

  const params = new URLSearchParams();
  if (cleanOrderId) {
    params.set('order', cleanOrderId);
  }
  if (cleanEmail) {
    params.set('email', cleanEmail);
  }

  const query = params.toString();
  const hash = query ? `#/pages/track-order?${query}` : '#/pages/track-order';
  return `${cleanOrigin}${cleanPath}/${hash}`;
}

/**
 * Resolves the exact string payload encoded into the QR matrix for the chosen scan mode.
 */
export function buildOrderQrPayload(
  mode: OrderQrMode,
  options: {
    origin: string;
    pathname: string;
    orderId: string;
    email?: string;
  },
): string {
  const cleanOrderId = normalizeOrderIdForQr(options.orderId);
  if (mode === 'order-id') {
    return cleanOrderId;
  }
  return buildMobileTrackingUrl(
    options.origin,
    options.pathname,
    cleanOrderId,
    options.email,
  );
}

/**
 * Synchronously generates a real ISO/IEC 18004 QR code matrix and crisp single-path SVG data
 * using `qrcode` (Error Correction Level M) so any mobile camera scans reliably.
 */
export function generateOrderQrData(
  payload: string,
  margin = 3,
): OrderQrMatrixData {
  const safePayload = payload.trim() || 'SPORT-CASTLE';
  const qr = QRCode.create(safePayload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const rawData = qr.modules.data;
  const safeMargin = Math.max(2, Math.floor(margin));

  const modules: boolean[][] = [];
  const pathSegments: string[] = [];

  for (let row = 0; row < size; row += 1) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < size; col += 1) {
      const isDark = Boolean(rawData[row * size + col]);
      rowCells.push(isDark);
      if (isDark) {
        const x = col + safeMargin;
        const y = row + safeMargin;
        pathSegments.push(`M${x},${y}h1v1h-1z`);
      }
    }
    modules.push(rowCells);
  }

  return {
    payload: safePayload,
    size,
    margin: safeMargin,
    viewBoxSize: size + safeMargin * 2,
    svgPath: pathSegments.join(''),
    modules,
  };
}

/**
 * Builds a clean download filename for saved QR pass exports.
 */
export function sanitizeQrDownloadFilename(
  orderId: string,
  extension: 'png' | 'svg' = 'png',
): string {
  const safeId = normalizeOrderIdForQr(orderId).replace(/[^A-Z0-9_-]/g, '') || 'ORDER';
  return `sport-castle-track-${safeId}.${extension}`;
}

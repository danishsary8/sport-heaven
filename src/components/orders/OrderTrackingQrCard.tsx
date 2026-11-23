import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Maximize2, QrCode, Smartphone, X } from 'lucide-react';
import {
  buildOrderQrPayload,
  generateOrderQrData,
  normalizeOrderIdForQr,
  sanitizeQrDownloadFilename,
  type OrderQrMode,
} from '../../utils/orderQr';

interface OrderTrackingQrCardProps {
  orderId: string;
  email?: string;
  status: string;
  trackingNumber: string;
  onNotify?: (message: string) => void;
}

export function OrderTrackingQrCard({
  orderId,
  email,
  status,
  trackingNumber,
  onNotify,
}: OrderTrackingQrCardProps) {
  const [mode, setMode] = useState<OrderQrMode>('tracking-link');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedOrderId = normalizeOrderIdForQr(orderId);

  const qrData = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://sportcastle.com.kh';
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '/';

    const payload = buildOrderQrPayload(mode, {
      origin,
      pathname,
      orderId: normalizedOrderId,
      email,
    });
    return generateOrderQrData(payload, 3);
  }, [mode, normalizedOrderId, email]);

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  const handleCopyPayload = () => {
    navigator.clipboard?.writeText(qrData.payload).catch(() => {});
    setCopied(true);
    onNotify?.(
      mode === 'tracking-link'
        ? `Copied mobile tracking link for #${normalizedOrderId}`
        : `Copied order ID #${normalizedOrderId}`,
    );
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadPng = () => {
    try {
      const canvas = document.createElement('canvas');
      const cardWidth = 640;
      const cardHeight = 760;
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Architectural chalk card backdrop
      ctx.fillStyle = '#FDFCF9';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      ctx.strokeStyle = '#0E1113';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, cardWidth - 40, cardHeight - 40);

      // Header metadata
      ctx.fillStyle = '#0E1113';
      ctx.font = '700 28px "Barlow Condensed", sans-serif';
      ctx.fillText('SPORT CASTLE · MOBILE TRACKING PASS', 48, 76);

      ctx.fillStyle = '#5A5D57';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillText(`ORDER #${normalizedOrderId}  ·  ${trackingNumber}`, 48, 108);

      // Pure white QR scanning zone
      const qrBoxSize = 480;
      const qrX = (cardWidth - qrBoxSize) / 2;
      const qrY = 136;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = 'rgba(14, 17, 19, 0.16)';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);

      // Crisp pixel-aligned QR modules
      const cellSize = Math.floor(qrBoxSize / qrData.viewBoxSize);
      const renderedQrPx = cellSize * qrData.viewBoxSize;
      const offsetX = qrX + Math.floor((qrBoxSize - renderedQrPx) / 2);
      const offsetY = qrY + Math.floor((qrBoxSize - renderedQrPx) / 2);

      ctx.fillStyle = '#0E1113';
      for (let r = 0; r < qrData.size; r += 1) {
        for (let c = 0; c < qrData.size; c += 1) {
          if (qrData.modules[r][c]) {
            ctx.fillRect(
              offsetX + (c + qrData.margin) * cellSize,
              offsetY + (r + qrData.margin) * cellSize,
              cellSize,
              cellSize,
            );
          }
        }
      }

      // Footer caption
      ctx.fillStyle = '#0E1113';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Status: ${status}`, 48, 666);

      ctx.fillStyle = '#5A5D57';
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(
        mode === 'tracking-link'
          ? 'Scan with phone camera to open live shipment milestones'
          : `Encoded Order ID: ${normalizedOrderId}`,
        48,
        698,
      );

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = sanitizeQrDownloadFilename(normalizedOrderId, 'png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify?.(`Saved QR tracking pass for #${normalizedOrderId}`);
    } catch {
      onNotify?.('Unable to export QR PNG in this browser');
    }
  };

  return (
    <>
      <section
        aria-label={`Mobile tracking QR code for order ${normalizedOrderId}`}
        className="border border-[#0E1113]/15 bg-[#FDFCF9] p-5 sm:p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#0E1113]" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold uppercase text-[#0E1113]">
                Mobile Tracking QR
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#5A5D57]">
              Scan with your phone camera to open live status on mobile
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label={`Expand QR code for order ${normalizedOrderId}`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#0E1113]/18 bg-[#F4F2EC] text-[#0E1113] transition-colors hover:border-[#0E1113] hover:bg-white cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Mode Segmented Selector */}
        <div
          role="group"
          aria-label="QR code payload mode"
          className="grid grid-cols-2 gap-1 bg-[#EAE7DF] p-1"
        >
          <button
            type="button"
            onClick={() => setMode('tracking-link')}
            aria-pressed={mode === 'tracking-link'}
            className={`h-8 px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'tracking-link'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#5A5D57] hover:text-[#0E1113]'
            }`}
          >
            Mobile Link
          </button>
          <button
            type="button"
            onClick={() => setMode('order-id')}
            aria-pressed={mode === 'order-id'}
            className={`h-8 px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'order-id'
                ? 'bg-[#0E1113] text-[#FDFCF9]'
                : 'text-[#5A5D57] hover:text-[#0E1113]'
            }`}
          >
            Order ID Only
          </button>
        </div>

        {/* High-Contrast Scannable QR Frame */}
        <div className="flex flex-col items-center border border-[#0E1113]/12 bg-[#FFFFFF] p-4">
          <svg
            role="img"
            aria-label={`QR code for order ${normalizedOrderId} (${
              mode === 'tracking-link' ? 'mobile tracking link' : 'order ID'
            })`}
            data-testid="order-tracking-qr-svg"
            data-qr-order-id={normalizedOrderId}
            data-qr-mode={mode}
            data-qr-payload={qrData.payload}
            viewBox={`0 0 ${qrData.viewBoxSize} ${qrData.viewBoxSize}`}
            shapeRendering="crispEdges"
            className="h-44 w-44 max-w-full"
          >
            <rect
              width={qrData.viewBoxSize}
              height={qrData.viewBoxSize}
              fill="#FFFFFF"
            />
            <path d={qrData.svgPath} fill="#0E1113" />
          </svg>

          <div className="mt-3 w-full border-t border-[#0E1113]/10 pt-2.5 text-center">
            <p className="font-mono text-xs font-semibold tracking-[0.12em] text-[#0E1113] tabular-nums">
              #{normalizedOrderId}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-[#5A5D57]">
              {mode === 'tracking-link'
                ? `#/pages/track-order?order=${normalizedOrderId}`
                : 'Direct Counter & Courier Scan ID'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0E1113] transition-colors hover:border-[#0E1113] hover:bg-white cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#032EA1]" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {copied
                ? 'Copied'
                : mode === 'tracking-link'
                  ? 'Copy Link'
                  : 'Copy ID'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#0E1113] bg-[#0E1113] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FDFCF9] transition-colors hover:bg-[#C8232C] hover:border-[#C8232C] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Save PNG</span>
          </button>
        </div>
      </section>

      {/* Enlarged Full-Contrast Scan Dialog */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded mobile tracking QR for order ${normalizedOrderId}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-[#0E1113]/65 backdrop-blur-[2px]"
            onClick={() => setIsExpanded(false)}
          />
          <div className="relative z-10 w-full max-w-sm border border-[#0E1113]/20 bg-[#FDFCF9] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#0E1113]/10 pb-4">
              <div>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#032EA1]">
                  {status} · {trackingNumber}
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold uppercase text-[#0E1113]">
                  Order #{normalizedOrderId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Close expanded QR dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#0E1113]/15 text-[#5A5D57] transition-colors hover:border-[#0E1113] hover:text-[#0E1113] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center border border-[#0E1113]/12 bg-[#FFFFFF] p-5">
              <svg
                role="img"
                aria-label={`Large QR code for order ${normalizedOrderId}`}
                viewBox={`0 0 ${qrData.viewBoxSize} ${qrData.viewBoxSize}`}
                shapeRendering="crispEdges"
                className="h-64 w-64 max-w-full"
              >
                <rect
                  width={qrData.viewBoxSize}
                  height={qrData.viewBoxSize}
                  fill="#FFFFFF"
                />
                <path d={qrData.svgPath} fill="#0E1113" />
              </svg>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#5A5D57]">
                <Smartphone className="h-3.5 w-3.5 text-[#0E1113]" aria-hidden="true" />
                <span>
                  {mode === 'tracking-link'
                    ? 'Point your phone camera to open live tracking'
                    : `Show at Sport Castle desk · #${normalizedOrderId}`}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyPayload}
                className="inline-flex h-11 items-center justify-center gap-1.5 border border-[#0E1113]/20 bg-[#F4F2EC] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0E1113] transition-colors hover:border-[#0E1113] hover:bg-white cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#032EA1]" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {copied
                    ? 'Copied'
                    : mode === 'tracking-link'
                      ? 'Copy Link'
                      : 'Copy ID'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                className="inline-flex h-11 items-center justify-center gap-1.5 bg-[#0E1113] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FDFCF9] transition-colors hover:bg-[#C8232C] cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

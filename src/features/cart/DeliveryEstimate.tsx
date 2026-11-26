import { useState } from 'react';
import { formatUsd, useI18n } from '../../lib/i18n';
import { useQuote } from '../checkout/api';
import { placeName, useProvinces } from '../geo/api';

/** Province → quote: the delivery options and fees the API offers for this bag. */
export function DeliveryEstimate() {
  const { t, lang } = useI18n();
  const provinces = useProvinces();
  const [province, setProvince] = useState('');
  const quote = useQuote(province ? { fulfillment: 'delivery', provinceCode: province } : null);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="estimate" className="text-sm font-semibold">
        {t('bag.estimate')}
      </label>
      <select id="estimate" value={province} onChange={(e) => setProvince(e.target.value)} className="h-11 w-full min-w-0 rounded-[6px] border border-[#C9C5BB] bg-paper px-3">
        <option value="">{t('bag.chooseProvince')}</option>
        {(provinces.data?.provinces ?? []).map((p) => (
          <option key={p.code} value={p.code}>
            {placeName(p, lang)}
          </option>
        ))}
      </select>
      {province && quote.data && (
        <ul aria-live="polite" className="flex flex-col gap-1 text-sm">
          {quote.data.shippingOptions
            .filter((o) => o.available)
            .map((o) => (
              <li key={o.methodId} className="flex justify-between gap-3">
                <span>
                  {o.name}
                  {o.eta && <span className="text-graphite">, {o.eta}</span>}
                </span>
                <span className="tabular font-semibold">{o.feeCents === 0 ? t('bag.free') : o.feeCents != null ? formatUsd(o.feeCents) : ''}</span>
              </li>
            ))}
          {quote.data.shippingOptions.every((o) => !o.available) && <li className="text-graphite">{t('bag.noDelivery')}</li>}
        </ul>
      )}
    </div>
  );
}

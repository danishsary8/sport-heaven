import { useState } from 'react';
import { useI18n } from '../../../lib/i18n';
import { Sheet } from '../../../ui';
import type { ProductDetail } from '../api';

type Guide = NonNullable<ProductDetail['sizeGuide']>;

export function SizeGuideButton({ guide }: { guide: Guide }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold underline underline-offset-4 hover:no-underline">
        {t('product.sizeGuide')}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="right" title={guide.title}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px] tabular">
            <thead>
              <tr className="border-b border-obsidian">
                {guide.columns.map((c) => (
                  <th key={c} scope="col" className="py-2 pr-3 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row, i) => (
                <tr key={i} className="border-b border-stone">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-graphite">{t('product.sizeGuideNote')}</p>
      </Sheet>
    </>
  );
}

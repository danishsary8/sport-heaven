import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';

/** One-time message after sign-in when the guest bag was added to the member's bag. */
export function MergeNotice() {
  const { t } = useI18n();
  const { cartMerged, clearCartMerged } = useAuth();
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!cartMerged) return;
    setShown(cartMerged.cappedLines > 0 ? t('signIn.mergedCapped', { n: cartMerged.mergedLines }) : cartMerged.mergedLines === 1 ? t('signIn.mergedOne') : t('signIn.merged', { n: cartMerged.mergedLines }));
    clearCartMerged();
  }, [cartMerged, clearCartMerged, t]);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(id);
  }, [shown]);
  if (!shown) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-[8px] bg-obsidian px-4 py-3 text-[15px] font-medium text-paper shadow-lg">
      {shown}
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { isApiError } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';
import { Button, EmptyState, Field, PageTitle, QueryView, Seo, Sheet, Skeleton, useToast } from '../../../ui';
import { AddressFields } from '../../checkout/AddressFields';
import { EMPTY_ADDRESS, looksLikePhone, type AddressDraft } from '../../checkout/address';
import { placeName } from '../../geo/api';
import { useAddresses, useCreateAddress, useDefaultAddress, useDeleteAddress, useUpdateAddress, type Address, type AddressBody } from '../api';

export function AddressesPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const list = useAddresses();
  const del = useDeleteAddress();
  const makeDefault = useDefaultAddress();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const onError = (e: unknown) => toast.error(isApiError(e) ? e.message : t('common.error'));
  return (
    <div className="flex flex-col gap-6">
      <Seo title={t('acc.nav.addresses')} noindex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle>{t('acc.nav.addresses')}</PageTitle>
        <Button variant="primary" onClick={() => setEditing('new')}>
          {t('acc.addAddress')}
        </Button>
      </div>
      <QueryView query={list} skeleton={<Skeleton className="h-40 w-full" />} isEmpty={(d) => d.addresses.length === 0} empty={<EmptyState title={t('acc.noAddresses')} body={t('acc.noAddressesBody')} />}>
        {(d) => (
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.addresses.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-[8px] border border-stone p-4">
                <p className="flex items-center gap-2 font-semibold">
                  {a.label}
                  {a.isDefault && <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-xs font-semibold text-cobalt">{t('acc.default')}</span>}
                </p>
                <p className="text-[15px]">
                  {a.recipientName}, <span className="tabular">{a.phone}</span>
                </p>
                <p className="text-[15px]">{a.street}</p>
                <p className="text-sm text-graphite">{[placeName(a.commune, lang), placeName(a.district, lang), placeName(a.province, lang)].join(', ')}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm font-semibold">
                  <button type="button" className="underline underline-offset-4" onClick={() => setEditing(a)}>
                    {t('acc.edit')}
                  </button>
                  {!a.isDefault && (
                    <button type="button" className="underline underline-offset-4" onClick={() => makeDefault.mutate(a.id, { onError })}>
                      {t('acc.makeDefault')}
                    </button>
                  )}
                  <button type="button" className="text-graphite underline underline-offset-4" aria-label={t('acc.deleteAddress', { label: a.label })} onClick={() => del.mutate(a.id, { onSuccess: () => toast.success(t('acc.addressDeleted')), onError })}>
                    {t('bag.removeShort')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? t('acc.newAddress') : t('acc.editAddress')}>
        {editing !== null && <AddressForm address={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function AddressForm({ address, onDone }: { address: Address | null; onDone(): void }) {
  const { t } = useI18n();
  const toast = useToast();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const [label, setLabel] = useState(address?.label ?? '');
  const [isDefault, setDefault] = useState(false);
  const [draft, setDraft] = useState<AddressDraft>(
    address
      ? { recipientName: address.recipientName, phone: address.phone, provinceCode: address.province.code, districtCode: address.district.code, communeCode: address.commune.code, street: address.street, landmark: address.landmark ?? '' }
      : EMPTY_ADDRESS,
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string | undefined> = {};
    if (!label.trim()) err.label = t('acc.err.label');
    if (!draft.recipientName.trim()) err['address.recipientName'] = t('co.err.name');
    if (!looksLikePhone(draft.phone)) err['address.phone'] = t('co.err.phoneFormat');
    if (!draft.provinceCode) err['address.provinceCode'] = t('co.err.province');
    if (!draft.districtCode) err['address.districtCode'] = t('co.err.district');
    if (!draft.communeCode) err['address.communeCode'] = t('co.err.commune');
    if (!draft.street.trim()) err['address.street'] = t('co.err.street');
    setErrors(err);
    if (Object.values(err).some(Boolean)) return;
    const body: AddressBody = {
      label: label.trim(),
      recipientName: draft.recipientName.trim(),
      phone: draft.phone.trim(),
      provinceCode: draft.provinceCode,
      districtCode: draft.districtCode,
      communeCode: draft.communeCode,
      street: draft.street.trim(),
      landmark: draft.landmark.trim() || null,
      ...(isDefault ? { isDefault: true } : {}),
    };
    const done = { onSuccess: () => (toast.success(t('acc.addressSaved')), onDone()), onError: (er: unknown) => setErrors({ form: isApiError(er) ? er.message : t('common.error') }) };
    if (address) update.mutate({ id: address.id, body }, done);
    else create.mutate(body, done);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {errors.form && (
        <p role="alert" className="font-medium text-vermilion">
          {errors.form}
        </p>
      )}
      <Field label={t('acc.addressLabel')} value={label} onChange={(e) => setLabel(e.target.value)} error={errors.label} hint={t('acc.addressLabelHint')} maxLength={40} />
      <AddressFields value={draft} onChange={setDraft} errors={errors} phoneHint={false} />
      {!address?.isDefault && (
        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-5 accent-obsidian" checked={isDefault} onChange={(e) => setDefault(e.target.checked)} />
          {t('acc.useAsDefault')}
        </label>
      )}
      <Button type="submit" variant="primary" loading={busy}>
        {t('acc.saveAddress')}
      </Button>
    </form>
  );
}

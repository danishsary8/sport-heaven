import { useI18n } from '../../lib/i18n';
import { Field, Select } from '../../ui';
import { placeName, useCommunes, useDistricts, useProvinces } from '../geo/api';
import type { AddressDraft } from './address';

/** Province → district → commune from the gazetteer, then street and an optional landmark. */
export function AddressFields({
  value,
  onChange,
  errors,
  prefix = 'address',
  withRecipient = true,
  phoneHint = true,
}: {
  value: AddressDraft;
  onChange(v: AddressDraft): void;
  errors: Record<string, string | undefined>;
  prefix?: string;
  withRecipient?: boolean;
  phoneHint?: boolean;
}) {
  const { t, lang } = useI18n();
  const provinces = useProvinces();
  const districts = useDistricts(value.provinceCode || undefined);
  const communes = useCommunes(value.districtCode || undefined);
  const set = (patch: Partial<AddressDraft>) => onChange({ ...value, ...patch });
  const err = (k: string) => errors[`${prefix}.${k}`];
  const failed = [provinces, districts, communes].find((q) => q.isError);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {failed && (
        <p role="alert" className="flex flex-wrap items-center gap-3 text-[15px] text-vermilion sm:col-span-2">
          {t('co.geoError')}
          <button type="button" className="font-semibold text-obsidian underline underline-offset-4" onClick={() => void failed.refetch()}>
            {t('co.geoRetry')}
          </button>
        </p>
      )}
      {withRecipient && (
        <>
          <Field id={`${prefix}.recipientName`} label={t('co.recipient')} value={value.recipientName} onChange={(e) => set({ recipientName: e.target.value })} error={err('recipientName')} autoComplete="name" maxLength={120} />
          <Field
            id={`${prefix}.phone`}
            label={t('co.recipientPhone')}
            value={value.phone}
            onChange={(e) => set({ phone: e.target.value })}
            error={err('phone')}
            hint={phoneHint ? t('co.recipientPhoneHint') : undefined}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
          />
        </>
      )}
      <Select id={`${prefix}.provinceCode`} label={t('co.province')} value={value.provinceCode} onChange={(e) => set({ provinceCode: e.target.value, districtCode: '', communeCode: '' })} error={err('provinceCode')}>
        <option value="">{t('co.choose')}</option>
        {(provinces.data?.provinces ?? []).map((p) => (
          <option key={p.code} value={p.code}>
            {placeName(p, lang)}
          </option>
        ))}
      </Select>
      <Select id={`${prefix}.districtCode`} label={t('co.district')} value={value.districtCode} onChange={(e) => set({ districtCode: e.target.value, communeCode: '' })} error={err('districtCode')} disabled={!value.provinceCode}>
        <option value="">{t('co.choose')}</option>
        {(districts.data?.districts ?? []).map((p) => (
          <option key={p.code} value={p.code}>
            {placeName(p, lang)}
          </option>
        ))}
      </Select>
      <Select id={`${prefix}.communeCode`} label={t('co.commune')} value={value.communeCode} onChange={(e) => set({ communeCode: e.target.value })} error={err('communeCode')} disabled={!value.districtCode}>
        <option value="">{t('co.choose')}</option>
        {(communes.data?.communes ?? []).map((p) => (
          <option key={p.code} value={p.code}>
            {placeName(p, lang)}
          </option>
        ))}
      </Select>
      <Field id={`${prefix}.street`} label={t('co.street')} value={value.street} onChange={(e) => set({ street: e.target.value })} error={err('street')} autoComplete="street-address" maxLength={240} className="sm:col-span-2" />
      <Field id={`${prefix}.landmark`} label={t('co.landmark')} value={value.landmark} onChange={(e) => set({ landmark: e.target.value })} error={err('landmark')} hint={t('co.landmarkHint')} maxLength={240} className="sm:col-span-2" />
    </div>
  );
}


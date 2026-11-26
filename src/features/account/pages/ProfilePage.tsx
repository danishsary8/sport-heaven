import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { isApiError } from '../../../lib/api';
import { useAuth, type PhoneConfirmation } from '../../../lib/auth';
import { useI18n } from '../../../lib/i18n';
import { Button, Field, PageTitle, QueryView, Select, Seo, Sheet, Skeleton, useToast } from '../../../ui';
import { useBranches } from '../../catalog/api';
import { toE164 } from '../SignInPage';
import { useDeleteMe, useMe, useUpdateMe, type Me, type MeBody } from '../api';

const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
const BOOT_SIZES = ['EU 38', 'EU 39', 'EU 40', 'EU 40.5', 'EU 41', 'EU 42', 'EU 42.5', 'EU 43', 'EU 44', 'EU 44.5', 'EU 45', 'EU 46'];

export function ProfilePage() {
  const { t } = useI18n();
  const me = useMe();
  return (
    <div className="flex flex-col gap-8">
      <Seo title={t('acc.nav.profile')} noindex />
      <PageTitle>{t('acc.nav.profile')}</PageTitle>
      <QueryView query={me} skeleton={<Skeleton className="h-80 w-full" />}>
        {(d) => (
          <>
            <ProfileForm user={d.user} />
            <PhoneSection user={d.user} />
            <DeleteAccount />
          </>
        )}
      </QueryView>
    </div>
  );
}

function ProfileForm({ user }: { user: Me }) {
  const { t } = useI18n();
  const toast = useToast();
  const branches = useBranches();
  const update = useUpdateMe();
  const initial = { fullName: user.fullName ?? '', preferredBootSize: user.preferredBootSize ?? '', preferredJerseySize: user.preferredJerseySize ?? '', homeBranchId: user.homeBranchId ?? '' };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setError(t('co.err.name'));
    setError(null);
    const body: MeBody = {};
    if (form.fullName.trim() !== initial.fullName) body.fullName = form.fullName.trim();
    if (form.preferredBootSize && form.preferredBootSize !== initial.preferredBootSize) body.preferredBootSize = form.preferredBootSize;
    if (form.preferredJerseySize && form.preferredJerseySize !== initial.preferredJerseySize) body.preferredJerseySize = form.preferredJerseySize as MeBody['preferredJerseySize'];
    if (form.homeBranchId && form.homeBranchId !== initial.homeBranchId) body.homeBranchId = form.homeBranchId;
    if (Object.keys(body).length === 0) return toast.success(t('acc.saved'));
    update.mutate(body, { onSuccess: () => toast.success(t('acc.saved')), onError: (err) => setError(isApiError(err) ? err.message : t('common.error')) });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label={t('co.name')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={error} autoComplete="name" maxLength={120} className="sm:col-span-2" />
      <Select label={t('acc.bootSize')} value={form.preferredBootSize} onChange={(e) => setForm({ ...form, preferredBootSize: e.target.value })}>
        <option value="">{t('acc.notSet')}</option>
        {BOOT_SIZES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
      <Select label={t('acc.jerseySize')} value={form.preferredJerseySize} onChange={(e) => setForm({ ...form, preferredJerseySize: e.target.value })}>
        <option value="">{t('acc.notSet')}</option>
        {JERSEY_SIZES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </Select>
      <Select label={t('acc.homeStore')} value={form.homeBranchId} onChange={(e) => setForm({ ...form, homeBranchId: e.target.value })} className="sm:col-span-2">
        <option value="">{t('acc.notSet')}</option>
        {(branches.data?.branches ?? []).map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="primary" loading={update.isPending} className="sm:col-span-2 sm:justify-self-start">
        {t('acc.save')}
      </Button>
    </form>
  );
}

/** Google-only members add a phone to earn points (Firebase linkWithPhoneNumber). */
function PhoneSection({ user }: { user: Me }) {
  const { t } = useI18n();
  const { adapter, refresh } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [conf, setConf] = useState<PhoneConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setError(null), [conf]);
  if (user.phone && user.phoneVerified) {
    return (
      <section>
        <h2 className="font-semibold">{t('co.phone')}</h2>
        <p className="tabular">{user.phone}</p>
      </section>
    );
  }
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await f();
    } catch (e) {
      setError(e instanceof Error && !e.message.startsWith('auth/') ? e.message : t('signIn.err.code'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-[8px] border border-brass/50 bg-brass/10 p-4">
      <h2 className="font-semibold">{t('acc.addPhoneTitle')}</h2>
      <p className="text-[15px]">{t('acc.addPhone')}</p>
      {!adapter.linkPhone ? (
        <p className="mt-2 text-sm text-graphite">{t('acc.linkUnavailable')}</p>
      ) : !conf ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label={t('co.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={error} className="min-w-0 flex-1" />
          <Button
            variant="primary"
            loading={busy}
            onClick={() =>
              void run(async () => {
                const e164 = toE164(phone);
                if (!e164) throw new Error(t('signIn.err.phone'));
                setConf(await adapter.linkPhone!(e164, 'recaptcha-link'));
              })
            }
          >
            {t('signIn.send')}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label={t('signIn.code')} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} error={error} className="min-w-0 flex-1" />
          <Button
            variant="primary"
            loading={busy}
            onClick={() =>
              void run(async () => {
                await conf.confirm(code);
                await refresh();
                toast.success(t('acc.phoneAdded'));
              })
            }
          >
            {t('acc.addPhoneConfirm')}
          </Button>
        </div>
      )}
      <div id="recaptcha-link" />
    </section>
  );
}

function DeleteAccount() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const del = useDeleteMe();
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-stone pt-6">
      <h2 className="font-semibold">{t('acc.deleteTitle')}</h2>
      <p className="text-[15px] text-graphite">{t('acc.deleteBody')}</p>
      <Button variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
        {t('acc.delete')}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} side="center" title={t('acc.deleteConfirm')}>
        <p>{t('acc.deleteBody')}</p>
        {del.isError && (
          <p role="alert" className="mt-3 font-medium text-vermilion">
            {isApiError(del.error) ? del.error.message : t('common.error')}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="primary"
            loading={del.isPending}
            onClick={() =>
              del.mutate(undefined, {
                onSuccess: async () => {
                  await signOut();
                  void navigate('/', { replace: true });
                },
              })
            }
          >
            {t('acc.delete')}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('acc.keep')}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}

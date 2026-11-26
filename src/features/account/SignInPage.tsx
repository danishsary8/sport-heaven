import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth, type PhoneConfirmation } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { Button, Field, PageTitle, Picture, Seo } from '../../ui';
import { PITCH_PHOTO } from '../../lib/siteImages';
import { toE164 } from './phone';

function friendly(e: unknown, t: ReturnType<typeof useI18n>['t']): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid-verification-code|code-expired/.test(msg)) return t('signIn.err.code');
  if (/too-many-requests|quota/.test(msg)) return t('signIn.err.tooMany');
  if (/invalid-phone-number/.test(msg)) return t('signIn.err.phone');
  if (/popup-closed|cancelled-popup/.test(msg)) return t('signIn.err.popup');
  if (/not set up/.test(msg)) return t('signIn.err.notSetUp');
  if (/network/.test(msg)) return t('signIn.err.network');
  return msg && !msg.startsWith('auth/') ? msg : t('common.error');
}

export function SignInPage() {
  const { t } = useI18n();
  const { status, adapter } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = ((location.state as { from?: string } | null)?.from ?? '/account').startsWith('/') ? ((location.state as { from?: string } | null)?.from ?? '/account') : '/account';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<PhoneConfirmation | null>(null);
  const [busy, setBusy] = useState<'send' | 'confirm' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (signedIn && status === 'member') void navigate(from, { replace: true });
  }, [signedIn, status, from, navigate]);

  if (status === 'member' && !signedIn) return <Navigate to={from} replace />;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!e164) return setError(t('signIn.err.phone'));
    setError(null);
    setBusy('send');
    try {
      setConfirmation(await adapter.startPhone(e164, 'recaptcha'));
    } catch (err) {
      setError(friendly(err, t));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmation) return;
    if (!/^\d{6}$/.test(code.trim())) return setError(t('signIn.err.code'));
    setError(null);
    setBusy('confirm');
    try {
      await confirmation.confirm(code.trim());
      setSignedIn(true);
    } catch (err) {
      setError(friendly(err, t));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await adapter.google();
      setSignedIn(true);
    } catch (err) {
      setError(friendly(err, t));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1320px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pt-10">
    <section className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-8 lg:px-0 lg:pt-14">
      <Seo title={t('signIn.title')} noindex />
      <PageTitle>{t('signIn.title')}</PageTitle>
      <p className="mt-2 text-graphite">{t('signIn.body')}</p>

      {error && (
        <p role="alert" className="mt-5 rounded-[6px] border border-vermilion bg-vermilion/5 px-3 py-2 font-medium text-vermilion">
          {error}
        </p>
      )}

      {!confirmation ? (
        <form onSubmit={send} noValidate className="mt-6 flex flex-col gap-4">
          <Field label={t('co.phone')} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint={t('signIn.phoneHint')} maxLength={20} />
          <Button type="submit" variant="primary" size="lg" block loading={busy === 'send'}>
            {t('signIn.send')}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} noValidate className="mt-6 flex flex-col gap-4">
          <p className="text-[15px]">{t('signIn.sent', { phone: toE164(phone) ?? phone })}</p>
          <Field label={t('signIn.code')} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} autoFocus />
          <Button type="submit" variant="primary" size="lg" block loading={busy === 'confirm'}>
            {t('signIn.confirm')}
          </Button>
          <button
            type="button"
            className="self-start text-sm font-semibold underline underline-offset-4"
            onClick={() => {
              setConfirmation(null);
              setCode('');
              setError(null);
            }}
          >
            {t('signIn.changePhone')}
          </button>
        </form>
      )}
      <div id="recaptcha" />

      <div className="my-6 flex items-center gap-3 text-sm text-graphite">
        <span className="h-px flex-1 bg-stone" />
        {t('signIn.or')}
        <span className="h-px flex-1 bg-stone" />
      </div>
      <Button variant="secondary" size="lg" block loading={busy === 'google'} onClick={() => void google()}>
        {t('signIn.google')}
      </Button>

      {from === '/checkout' && (
        <Link to="/checkout" className="mt-6 block text-center font-semibold underline underline-offset-4">
          {t('signIn.guest')}
        </Link>
      )}
      <p className="mt-8 text-sm text-graphite">{t('signIn.why')}</p>
    </section>
      {/* Desktop only: the pitch photo from the home page, so signing in still feels like the shop. */}
      <div aria-hidden className="relative hidden overflow-hidden rounded-[8px] bg-obsidian lg:block lg:min-h-[560px]">
        <Picture src={PITCH_PHOTO} alt="" sizes="50vw" width={1440} height={900} className="absolute inset-0 h-full w-full" imgClassName="opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(14_17_19/0.7),transparent_55%)]" />
        <span className="flag-rule absolute bottom-8 left-8 block h-3 w-[72px]" />
      </div>
    </div>
  );
}

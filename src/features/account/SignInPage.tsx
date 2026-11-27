import { CircleAlert, MapPin, Package, ShieldCheck, Star } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth, type PhoneConfirmation } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { Button, PageTitle, Picture, Seo, cx } from '../../ui';
import { GoogleMark } from '../../ui/GoogleMark';
import { SIGN_IN_PHOTO } from '../../lib/siteImages';
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
    <div className="mx-auto grid max-w-[1320px] lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:px-8 lg:py-8">
      <Seo title={t('signIn.title')} noindex />
      {/* Phones: the photo as a short banner above the form. */}
      <div aria-hidden className="relative mx-4 mt-4 h-40 overflow-hidden rounded-[14px] bg-obsidian sm:h-52 lg:hidden">
        <Picture src={SIGN_IN_PHOTO} alt="" sizes="100vw" width={1440} height={1920} className="absolute inset-0" imgClassName="object-[50%_30%]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(14_17_19/0.55),transparent_60%)]" />
        <span className="flag-rule absolute bottom-4 left-4 block h-2.5 w-14" />
      </div>

      <section className="mx-auto flex w-full max-w-[420px] flex-col justify-center px-4 pb-16 pt-8 lg:px-0 lg:py-10">
        <PageTitle>{t('signIn.title')}</PageTitle>
        <p className="mt-3 text-[15px] leading-relaxed text-graphite">{t('signIn.body')}</p>

        {error && (
          <p role="alert" className="mt-6 flex gap-2.5 rounded-[10px] bg-vermilion/[0.07] px-3.5 py-3 text-[15px] font-medium text-vermilion">
            <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {!confirmation ? (
          <form onSubmit={send} noValidate className="mt-7 flex flex-col gap-5">
            <PhoneField value={phone} onChange={setPhone} invalid={!!error && error === t('signIn.err.phone')} />
            <Button type="submit" variant="primary" size="lg" block loading={busy === 'send'} className="rounded-[10px]">
              {t('signIn.send')}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirm} noValidate className="mt-7 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 rounded-[10px] bg-stone/70 px-3.5 py-3">
              <p className="text-[15px]">{t('signIn.sent', { phone: toE164(phone) ?? phone })}</p>
              <button
                type="button"
                className="shrink-0 text-sm font-semibold underline underline-offset-4"
                onClick={() => {
                  setConfirmation(null);
                  setCode('');
                  setError(null);
                }}
              >
                {t('signIn.changePhone')}
              </button>
            </div>
            <CodeField value={code} onChange={setCode} />
            <Button type="submit" variant="primary" size="lg" block loading={busy === 'confirm'} className="rounded-[10px]">
              {t('signIn.confirm')}
            </Button>
          </form>
        )}
        <div id="recaptcha" />

        <div className="my-7 flex items-center gap-4 text-sm text-graphite">
          <span className="h-px flex-1 bg-[#DEDAD0]" />
          {t('signIn.or')}
          <span className="h-px flex-1 bg-[#DEDAD0]" />
        </div>
        <button
          type="button"
          onClick={() => void google()}
          disabled={busy === 'google'}
          aria-busy={busy === 'google' || undefined}
          className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-[10px] border border-[#D6D2C8] bg-white text-base font-semibold text-[#1F1F1F] shadow-[0_1px_2px_rgb(14_17_19/0.05)] transition-[border-color,box-shadow] hover:border-[#A29E94] hover:shadow-[0_6px_16px_-10px_rgb(14_17_19/0.35)] disabled:opacity-60"
        >
          {busy === 'google' ? <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <GoogleMark className="size-5" />}
          {t('signIn.google')}
        </button>

        {from === '/checkout' && (
          <Link to="/checkout" className="mt-6 block text-center font-semibold underline underline-offset-4">
            {t('signIn.guest')}
          </Link>
        )}
        <p className="mt-8 flex gap-2 text-sm leading-relaxed text-graphite">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('signIn.why')}
        </p>
      </section>

      {/* Desktop: the photo, with what membership gives you. */}
      <div className="relative hidden overflow-hidden rounded-[18px] bg-obsidian lg:block">
        <Picture src={SIGN_IN_PHOTO} alt="" sizes="50vw" width={1440} height={1920} className="absolute inset-0" imgClassName="object-[50%_58%]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(14_17_19/0.88)_0%,rgb(14_17_19/0.35)_45%,transparent_70%)]" />
        <div className="absolute inset-x-8 bottom-8 text-paper xl:inset-x-10 xl:bottom-10">
          <span aria-hidden className="flag-rule mb-5 block h-2.5 w-14" />
          <h2 className="max-w-[22ch] font-display text-[44px] font-bold leading-[0.95] xl:text-[52px]">{t('signIn.panelTitle')}</h2>
          <ul className="mt-6 grid gap-2.5 xl:grid-cols-3">
            {PERKS.map(({ key, Icon }) => (
              <li key={key} className="flex items-start gap-2.5 rounded-[12px] bg-paper/10 p-3 text-[14px] leading-snug backdrop-blur-md xl:flex-col">
                <Icon className="size-5 shrink-0 text-paper/85" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const PERKS = [
  { key: 'signIn.perk.points', Icon: Star },
  { key: 'signIn.perk.addresses', Icon: MapPin },
  { key: 'signIn.perk.orders', Icon: Package },
] as const;

/** Phone number with the +855 country code shown as a fixed prefix (typing it, or a leading 0, still works). */
function PhoneField({ value, onChange, invalid }: { value: string; onChange(v: string): void; invalid: boolean }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {t('co.phone')}
      </label>
      <div
        className={cx(
          'flex h-13 items-center overflow-hidden rounded-[10px] border bg-paper transition-[border-color,box-shadow] focus-within:border-obsidian focus-within:shadow-[0_0_0_3px_rgb(14_17_19/0.08)]',
          invalid ? 'border-vermilion' : 'border-[#C9C5BB] hover:border-[#A29E94]',
        )}
      >
        <span aria-hidden className="flex h-full items-center gap-2 border-r border-[#E2DED5] bg-chalk px-3.5 text-[15px] font-semibold">
          <span className="flag-rule block h-3.5 w-5 rounded-[2px]" />
          +855
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={20}
          placeholder="12 345 678"
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[17px] tracking-[0.02em] outline-none placeholder:text-graphite/60"
        />
      </div>
      <p id={`${id}-hint`} className="text-sm text-graphite">
        {t('signIn.phoneHint')}
      </p>
    </div>
  );
}

/** Six boxes over one real input, so paste, SMS autofill and screen readers all see a normal field. */
function CodeField({ value, onChange }: { value: string; onChange(v: string): void }) {
  const { t } = useI18n();
  const id = useId();
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, 5);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {t('signIn.code')}
      </label>
      <div className="relative">
        <div aria-hidden className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              data-active={focused && i === active}
              className={cx(
                'otp-cell grid h-14 place-items-center rounded-[10px] border bg-paper font-display text-[28px] font-bold transition-[border-color,box-shadow]',
                value[i] ? 'border-obsidian' : 'border-[#C9C5BB]',
              )}
            >
              {value[i] ?? (focused && i === active ? <span className="otp-caret block h-6 w-0.5 bg-obsidian" /> : null)}
            </span>
          ))}
        </div>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={6}
          autoFocus
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent"
        />
      </div>
    </div>
  );
}

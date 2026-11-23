import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  KeyRound,
  Lock,
  Mail,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { validatePasswordStrength } from '../utils/commerce';

function AtelierAuthShell({
  eyebrow,
  title,
  italicAccent,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  italicAccent: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[82vh] bg-[#F4F2EC] atelier-grid-bg py-12 sm:py-16">
      <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 border border-[#0E1113]/15 bg-[#FDFCF9] lg:grid-cols-12">
          {/* Left Editorial Identity Panel */}
          <div className="flex flex-col justify-between bg-[#0E1113] p-8 text-[#FDFCF9] sm:p-10 lg:col-span-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.26em] text-[#B8933B] uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-4 font-display text-5xl leading-[0.9] font-extrabold tracking-tight uppercase sm:text-6xl">
                {title}{' '}
                <span className="font-editorial font-normal italic text-[#EAE7DF] normal-case">
                  {italicAccent}
                </span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-[#FDFCF9]/70">
                {subtitle}
              </p>
            </div>

            <div className="mt-10 space-y-4 border-t border-[#FDFCF9]/15 pt-6">
              {[
                '10 pts per $1 spent across all 3 Phnom Penh branches',
                'Saved EU boot & jersey sizes for 1-click checkout',
                'Instant order tracking, PDF invoices & 30-day RMA portal',
                'Early access to 2026/27 UCL & Limited Boot Drops',
              ].map((perk, idx) => (
                <div key={perk} className="flex items-start gap-3 text-xs text-[#FDFCF9]/80">
                  <span className="mt-0.5 font-mono text-[10px] text-[#B8933B]">
                    0{idx + 1}
                  </span>
                  <span>{perk}</span>
                </div>
              ))}
              <div className="pt-4 font-mono text-[10px] tracking-[0.2em] text-[#FDFCF9]/45 uppercase">
                11.5564° N · 104.9282° E · PHNOM PENH ATELIER
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="p-8 sm:p-10 lg:col-span-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signInWithEmail, signInWithGoogle, navigate } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Enter your password (minimum 6 characters).');
      return;
    }
    setIsSubmitting(true);
    const result = await signInWithEmail(email, password);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Unable to sign in.');
      return;
    }
    navigate({ page: 'account', section: 'overview' });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    const ok = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (ok) {
      navigate({ page: 'account', section: 'overview' });
    }
  };

  return (
    <AtelierAuthShell
      eyebrow="SPORT CASTLE CLUB · MEMBER ACCESS"
      title="Return to the"
      italicAccent="Club Room"
      subtitle="Access your Phnom Penh order archive, saved KHQR & Visa vault, fit profile, and Kouprey Gold loyalty tier."
    >
      <div className="flex items-center justify-between border-b border-[#0E1113]/15 pb-4">
        <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#0E1113] uppercase">
          Club Member Sign In
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-[#0E1113]/50 uppercase">
          Firebase Auth · Cloud SQL Sync
        </span>
      </div>

      {/* Google Sign-In */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="flex w-full items-center justify-center gap-2.5 border border-[#0E1113]/20 bg-[#FDFCF9] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-[#0E1113] uppercase transition hover:border-[#0E1113] hover:bg-[#F4F2EC] disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#C8232C]" />
          {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#0E1113]/15" />
        <span className="font-mono text-[10px] tracking-[0.2em] text-[#0E1113]/45 uppercase">
          OR SIGN IN WITH EMAIL &amp; PASSWORD
        </span>
        <div className="h-px flex-1 bg-[#0E1113]/15" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
          >
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@phnompenh.kh"
            className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => navigate({ page: 'recover' })}
              className="font-mono text-[10px] tracking-[0.14em] text-[#C8232C] uppercase hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            className="border border-[#C8232C]/30 bg-[#C8232C]/10 px-3 py-2 text-xs font-medium text-[#C8232C]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="flex w-full items-center justify-center gap-2 bg-[#0E1113] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.18em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          {isSubmitting ? 'Signing In...' : 'Sign In to Club Account'}
        </button>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#0E1113]/15 pt-5 text-xs text-[#0E1113]/70">
        <span>New to Sport Castle Phnom Penh?</span>
        <button
          type="button"
          onClick={() => navigate({ page: 'register' })}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-[#0E1113] uppercase hover:text-[#C8232C] cursor-pointer"
        >
          Create Club Account <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </AtelierAuthShell>
  );
}

export function RegisterPage() {
  const { signUpWithEmail, signInWithGoogle, navigate } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+855 12 ');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = validatePasswordStrength(password);

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);
    const ok = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (ok) {
      navigate({ page: 'account', section: 'overview' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!strength.isValid) {
      setError('Password must meet all three security requirements below.');
      return;
    }
    setIsSubmitting(true);
    const result = await signUpWithEmail({
      fullName,
      email,
      password,
      phone,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Unable to create account.');
      return;
    }
    navigate({ page: 'account', section: 'overview' });
  };

  return (
    <AtelierAuthShell
      eyebrow="NEW MEMBERSHIP · JOIN THE SQUAD"
      title="Join Sport Castle"
      italicAccent="Club"
      subtitle="Register once to unlock member pricing, instant Phnom Penh rider address presets, and Kouprey Gold rewards."
    >
      <div className="mb-6">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isSubmitting}
          className="flex w-full items-center justify-center gap-2.5 border border-[#0E1113]/20 bg-[#FDFCF9] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-[#0E1113] uppercase transition hover:border-[#0E1113] hover:bg-[#F4F2EC] disabled:opacity-60 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#C8232C]" />
          {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#0E1113]/15" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#0E1113]/45 uppercase">
            OR REGISTER WITH EMAIL
          </span>
          <div className="h-px flex-1 bg-[#0E1113]/15" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="register-name"
              className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
            >
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Virak Dara"
              className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
              required
            />
          </div>
          <div>
            <label
              htmlFor="register-phone"
              className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
            >
              Phone (Cambodia)
            </label>
            <input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 12 345 678"
              className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
          >
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
            required
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
          >
            Create Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 chars, 1 uppercase, 1 number"
            className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
            required
          />
          <div className="mt-2.5 grid grid-cols-1 gap-1.5 border border-[#0E1113]/10 bg-[#F4F2EC] p-3 sm:grid-cols-3">
            {[
              { ok: strength.minLength, label: '8+ Characters' },
              { ok: strength.hasUpper, label: '1 Uppercase (A-Z)' },
              { ok: strength.hasNumber, label: '1 Number (0-9)' },
            ].map((rule) => (
              <div
                key={rule.label}
                className={`flex items-center gap-1.5 font-mono text-[10px] uppercase ${
                  rule.ok ? 'font-bold text-emerald-700' : 'text-[#0E1113]/50'
                }`}
              >
                <Check className={`h-3 w-3 ${rule.ok ? 'opacity-100' : 'opacity-30'}`} />
                {rule.label}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="border border-[#C8232C]/30 bg-[#C8232C]/10 px-3 py-2 text-xs font-medium text-[#C8232C]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isGoogleLoading}
          className="flex w-full items-center justify-center gap-2 bg-[#0E1113] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.18em] text-[#FDFCF9] uppercase transition hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {isSubmitting ? 'Creating Account...' : 'Create Sport Castle Account'}
        </button>

        <p className="text-[11px] leading-relaxed text-[#0E1113]/55">
          By registering, you agree to Sport Castle’s{' '}
          <button
            type="button"
            onClick={() => navigate({ page: 'policy', slug: 'terms-of-service' })}
            className="underline hover:text-[#0E1113] cursor-pointer"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => navigate({ page: 'policy', slug: 'privacy-policy' })}
            className="underline hover:text-[#0E1113] cursor-pointer"
          >
            Privacy Policy
          </button>
          .
        </p>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#0E1113]/15 pt-5 text-xs text-[#0E1113]/70">
        <span>Already a Club member?</span>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-[#0E1113] uppercase hover:text-[#C8232C] cursor-pointer"
        >
          Sign In <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </AtelierAuthShell>
  );
}

export function RecoverPasswordPage() {
  const { requestPasswordReset, navigate } = useStore();
  const [step, setStep] = useState<'request' | 'sent'>('request');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setIsSending(true);
    const result = await requestPasswordReset(email);
    setIsSending(false);
    if (!result.ok) {
      setError(result.error ?? 'Unable to send password reset email.');
      return;
    }
    setStep('sent');
  };

  return (
    <AtelierAuthShell
      eyebrow="ACCOUNT RECOVERY · FIREBASE RESET"
      title="Password"
      italicAccent="Recovery"
      subtitle="Request a secure password reset link via Firebase Authentication to restore access to your Sport Castle Club profile."
    >
      {step === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <p className="text-sm text-[#0E1113]/75">
            Enter the email address associated with your Sport Castle account. Firebase will send a secure password reset link to your inbox.
          </p>
          <div>
            <label
              htmlFor="recover-email"
              className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.18em] text-[#0E1113]/65 uppercase"
            >
              Registered Email
            </label>
            <input
              id="recover-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full border border-[#0E1113]/20 bg-[#F4F2EC] px-4 py-3 text-sm text-[#0E1113] outline-none focus:border-[#0E1113]"
              required
            />
          </div>
          {error && (
            <p
              role="alert"
              className="border border-[#C8232C]/30 bg-[#C8232C]/10 px-3 py-2 text-xs text-[#C8232C]"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSending}
            className="flex w-full items-center justify-center gap-2 bg-[#0E1113] px-6 py-3.5 font-mono text-xs font-bold tracking-[0.18em] text-[#FDFCF9] uppercase hover:bg-[#C8232C] disabled:opacity-60 cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {isSending ? 'Sending Reset Link...' : 'Send Password Reset Email'}
          </button>
        </form>
      )}

      {step === 'sent' && (
        <div className="border border-emerald-700/25 bg-emerald-50/70 p-6">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.18em] text-emerald-800 uppercase">
            <Mail className="h-4 w-4" />
            Reset Link Dispatched
          </div>
          <p className="mt-2 text-sm text-[#0E1113]/80">
            We sent a Firebase password reset link to <strong className="text-[#0E1113]">{email.trim()}</strong>. Follow the link in your inbox to set a new password, then sign in below.
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'login' })}
            className="mt-4 inline-flex items-center gap-2 bg-[#0E1113] px-5 py-3 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FDFCF9] uppercase hover:bg-[#C8232C] cursor-pointer"
          >
            Proceed to Sign In <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-[#0E1113]/15 pt-5">
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="font-mono text-[11px] font-semibold tracking-[0.16em] text-[#0E1113]/70 uppercase hover:text-[#0E1113] cursor-pointer"
        >
          ← Back to Sign In
        </button>
      </div>
    </AtelierAuthShell>
  );
}


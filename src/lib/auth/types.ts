import type { ResponseOf } from '../api';

export type SessionResponse = ResponseOf<'/v1/auth/session', 'post'>;
export type SessionUser = SessionResponse['user'];

export interface PhoneConfirmation {
  confirm(code: string): Promise<void>;
}

/** The sign-in provider behind the shop (Firebase in production, an in-memory stand-in for end-to-end tests). */
export interface AuthAdapter {
  onChange(cb: (signedIn: boolean) => void): () => void;
  getToken(forceRefresh?: boolean): Promise<string | null>;
  signOut(): Promise<void>;
  startPhone(e164: string, recaptchaContainerId: string): Promise<PhoneConfirmation>;
  google(): Promise<void>;
  linkPhone?(e164: string, recaptchaContainerId: string): Promise<PhoneConfirmation>;
  /** End-to-end tests only; present only when VITE_AUTH_TEST_MODE=true at build time. */
  testSignIn?(token: string): Promise<void>;
}

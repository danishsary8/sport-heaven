import type { AuthAdapter } from './types';

/**
 * Sign-in for end-to-end tests against a backend running with AUTH_TEST_MODE=true.
 * Tokens look like `test:<uid>:<phone|->:<email|->[:<name>]` and live in memory only.
 */
export const TEST_CODE = '123456';

export function createTestAdapter(): AuthAdapter {
  let token: string | null = null;
  const listeners = new Set<(signedIn: boolean) => void>();
  const emit = () => listeners.forEach((l) => l(token !== null));
  const notReal = async (): Promise<never> => {
    throw new Error('Google sign-in is not available in test mode. Use your phone number.');
  };
  return {
    onChange(cb) {
      listeners.add(cb);
      queueMicrotask(() => cb(token !== null));
      return () => listeners.delete(cb);
    },
    async getToken() {
      return token;
    },
    async signOut() {
      token = null;
      emit();
    },
    /** Test builds: any phone signs in with the code 123456 (the backend accepts the token only in AUTH_TEST_MODE). */
    async startPhone(e164: string) {
      return {
        async confirm(code: string) {
          if (code.trim() !== TEST_CODE) throw new Error('auth/invalid-verification-code');
          token = `test:phone-${e164.replace(/\D/g, '')}:${e164}:-`;
          emit();
        },
      };
    },
    google: notReal,
    async testSignIn(t: string) {
      token = t;
      emit();
    },
  };
}

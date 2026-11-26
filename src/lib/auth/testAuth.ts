import type { AuthAdapter } from './types';

/**
 * Sign-in for end-to-end tests against a backend running with AUTH_TEST_MODE=true.
 * Tokens look like `test:<uid>:<phone|->:<email|->[:<name>]` and live in memory only.
 */
export function createTestAdapter(): AuthAdapter {
  let token: string | null = null;
  const listeners = new Set<(signedIn: boolean) => void>();
  const emit = () => listeners.forEach((l) => l(token !== null));
  const notReal = async (): Promise<never> => {
    throw new Error('Test sign-in only: use testSignIn with a test token.');
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
    startPhone: notReal,
    google: notReal,
    async testSignIn(t: string) {
      token = t;
      emit();
    },
  };
}

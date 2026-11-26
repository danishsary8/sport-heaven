import { createFirebaseAdapter } from './firebase';
import { createTestAdapter } from './testAuth';
import type { AuthAdapter } from './types';

type Env = Partial<Record<string, string | boolean | undefined>>;

/** Used when Firebase keys are missing (e.g. local development without an account): browsing works, sign-in explains why not. */
function unconfiguredAdapter(): AuthAdapter {
  const refuse = async (): Promise<never> => {
    throw new Error('Sign-in is not set up on this server yet.');
  };
  return {
    onChange(cb) {
      queueMicrotask(() => cb(false));
      return () => {};
    },
    getToken: async () => null,
    signOut: async () => {},
    startPhone: refuse,
    google: refuse,
  };
}

export function createAuthAdapter(env: Env = import.meta.env): AuthAdapter {
  if (env.VITE_AUTH_TEST_MODE === 'true') return createTestAdapter();
  const apiKey = typeof env.VITE_FIREBASE_API_KEY === 'string' ? env.VITE_FIREBASE_API_KEY : '';
  if (!apiKey) return unconfiguredAdapter();
  return createFirebaseAdapter({
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  });
}

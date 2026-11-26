import type { AuthAdapter, PhoneConfirmation } from './types';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
}

/** Firebase phone (SMS) and Google sign-in. Firebase is loaded on first use, keeping it out of the first page load. */
export function createFirebaseAdapter(config: FirebaseWebConfig): AuthAdapter {
  const load = async () => {
    const [{ getApp, getApps, initializeApp }, authMod] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps().length ? getApp() : initializeApp(config);
    return { auth: authMod.getAuth(app), authMod };
  };
  let loaded: ReturnType<typeof load> | null = null;
  const firebase = () => (loaded ??= load());

  const verifier = async (containerId: string) => {
    const { auth, authMod } = await firebase();
    return new authMod.RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  };

  return {
    onChange(cb) {
      let unsubscribe: (() => void) | null = null;
      let cancelled = false;
      void firebase().then(({ auth, authMod }) => {
        if (!cancelled) unsubscribe = authMod.onIdTokenChanged(auth, (u) => cb(u !== null));
      });
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    },
    async getToken(forceRefresh) {
      const { auth } = await firebase();
      return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
    },
    async signOut() {
      const { auth, authMod } = await firebase();
      await authMod.signOut(auth);
    },
    async startPhone(e164, containerId): Promise<PhoneConfirmation> {
      const { auth, authMod } = await firebase();
      const result = await authMod.signInWithPhoneNumber(auth, e164, await verifier(containerId));
      return { confirm: async (code) => void (await result.confirm(code)) };
    },
    async linkPhone(e164, containerId): Promise<PhoneConfirmation> {
      const { auth, authMod } = await firebase();
      if (!auth.currentUser) throw new Error('Sign in first');
      const result = await authMod.linkWithPhoneNumber(auth.currentUser, e164, await verifier(containerId));
      return { confirm: async (code) => void (await result.confirm(code)) };
    },
    async google() {
      const { auth, authMod } = await firebase();
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await authMod.signInWithPopup(auth, provider);
    },
  };
}

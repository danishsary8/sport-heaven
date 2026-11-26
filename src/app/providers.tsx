import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { configureApi } from '../lib/api';
import { AuthProvider, type AuthAdapter } from '../lib/auth';
import { I18nProvider, useI18n, type Lang } from '../lib/i18n';
import { ToastProvider } from '../ui';

/** Tells the API client which language to ask for. */
function LangBridge() {
  const { lang } = useI18n();
  useEffect(() => configureApi({ lang: () => lang }), [lang]);
  return null;
}

export function AppProviders({ adapter, queryClient, initialLang, children }: { adapter: AuthAdapter; queryClient: QueryClient; initialLang?: Lang; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initial={initialLang}>
        <LangBridge />
        <AuthProvider adapter={adapter}>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

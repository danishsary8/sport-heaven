import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './app/fonts';
import './index.css';
import { AppProviders } from './app/providers';
import { createQueryClient } from './app/queryClient';
import { routes } from './app/routes';
import { configureApi } from './lib/api';
import { createAuthAdapter } from './lib/auth';

configureApi({ baseUrl: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '' });

const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders adapter={createAuthAdapter()} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);

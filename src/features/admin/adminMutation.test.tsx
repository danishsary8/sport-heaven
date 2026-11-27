import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useAdminMutation } from './api';

describe('useAdminMutation', () => {
  it('marks the shop catalog stale after a save, so the home page shows the edit', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['catalog', 'home', 'en'], { sections: [] });
    qc.setQueryData(['admin', 'products'], []);
    qc.setQueryData(['geo', 'provinces'], []);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useAdminMutation(async () => 'ok', [['products']]), { wrapper });
    await act(() => result.current.mutateAsync(undefined));
    expect(qc.getQueryState(['catalog', 'home', 'en'])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['admin', 'products'])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(['geo', 'provinces'])?.isInvalidated).toBe(false);
  });
});

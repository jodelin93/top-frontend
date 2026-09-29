'use client';

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nRoot } from '@/i18n/i18n-root';
import type { Lang } from '@/i18n';
import { HelpRoot } from '@/help/help-drawer';

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  const create = () =>
    new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
    });
  // Keep server renders isolated and reuse one client in the browser
  if (typeof window === 'undefined') return create();
  browserQueryClient ??= create();
  return browserQueryClient;
}

export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <I18nRoot initialLang={initialLang}>
        {children}
        <HelpRoot />
      </I18nRoot>
    </QueryClientProvider>
  );
}

'use client';

import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { I18nRoot } from '@/i18n/i18n-root';
import type { Lang } from '@/i18n';
import { HelpRoot } from '@/help/help-drawer';

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

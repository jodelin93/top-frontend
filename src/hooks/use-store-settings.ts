'use client';

import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';

// Store-wide settings (currency, tax mode, receipt text), cached app-wide
export function useStoreSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 5 * 60_000 });
}

export function useCurrency(): string {
  return useStoreSettings().data?.currencyCode ?? 'USD';
}

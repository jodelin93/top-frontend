import { QueryClient } from '@tanstack/react-query';

let browserQueryClient: QueryClient | undefined;

const create = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });

/** One client in the browser (shared by every page); a fresh one per server render */
export function getQueryClient() {
  if (typeof window === 'undefined') return create();
  browserQueryClient ??= create();
  return browserQueryClient;
}

/**
 * Forget every cached answer (profile, lists, customers...): the next person on
 * this browser must never see, or act on, the previous user's data.
 */
export function clearQueryCache() {
  browserQueryClient?.clear();
}

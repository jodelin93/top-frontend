import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogItem } from '@/lib/api/sales';
import { deviceStore, offlineCache, pendingSales, resetOfflineDbForTests } from '@/lib/pos/offline-db';
import { useAuthStore } from '@/stores/auth-store';
import { useCatalog, useDeviceLease, usePendingSales } from './use-pos-data';

const item = (variantId: string, productName: string): CatalogItem => ({
  variantId,
  productId: 'p',
  categoryId: null,
  productName,
  variantName: null,
  sku: variantId.toUpperCase(),
  barcode: `B-${variantId}`,
  price: 2,
  stock: null,
  allowBackorder: false,
  imageUrl: null,
});

// Same defaults as the app's QueryClient (src/app/providers.tsx)
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

async function enroll() {
  await deviceStore.save({ id: 'd1', tenantId: 't1', name: 'Till 1', registeredAt: '' });
  await deviceStore.saveLease('d1', {
    leaseExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    revokedAt: null,
    checkedAt: new Date().toISOString(),
  });
}

beforeEach(async () => {
  await resetOfflineDbForTests();
  globalThis.indexedDB = new IDBFactory();
  // The browser reports no connection: TanStack Query pauses 'online' queries
  onlineManager.setOnline(false);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('POS data while the till is offline', () => {
  it('searches the cached catalog by name', async () => {
    await offlineCache.saveCatalog('r1', [item('v1', 'Apple juice'), item('v2', 'Bread')]);
    const { result } = renderHook(() => useCatalog('r1', false), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    const found = await result.current.search({ search: 'apple' });
    expect(found.map((i) => i.variantId)).toEqual(['v1']);
    // Browsing (no search): the whole cached catalog
    expect(await result.current.search({})).toHaveLength(2);
  });

  it('lists the sales queued on the device', async () => {
    await enroll();
    await pendingSales.add({
      id: 'sale-1',
      input: { registerId: 'r1', items: [{ variantId: 'v1', quantity: 1 }], payments: [], idempotencyKey: 'sale-1' },
      createdAt: new Date().toISOString(),
      total: 2,
      actorId: 'u1',
      snapshot: {
        currencyCode: 'USD',
        taxRate: 0,
        pricesIncludeTax: false,
        maxDiscountPercent: null,
        exchangeRates: {},
        settingsVersion: null,
        discount: null,
        cartDiscount: null,
        lines: [],
      },
    });
    const { result } = renderHook(() => usePendingSales(false), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.sales.map((s) => s.id)).toEqual(['sale-1']));
  });

  it('reads the stored offline lease (time left offline)', async () => {
    await enroll();
    useAuthStore.setState({ user: { tenantId: 't1' } as never });
    const { result } = renderHook(() => useDeviceLease(false, 'r1'), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.leaseChecked).toBe(true));
    expect(result.current.device?.id).toBe('d1');
    expect(result.current.leaseExpired).toBe(false);
    expect(result.current.leaseExpiresAt).not.toBeNull();
    expect(result.current.offlineBlocked).toBe(false);
  });
});

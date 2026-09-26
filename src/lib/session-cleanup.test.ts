import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PosContext } from '@/lib/api/sales';
import { offlineCache, resetOfflineDbForTests } from '@/lib/pos/offline-db';
import { usePOSStore } from '@/stores/pos-store';
import { clearLocalSessionData, POS_CART_KEY, STAFF_CACHE_KEY } from './session-cleanup';

beforeEach(async () => {
  await resetOfflineDbForTests();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

describe('clearLocalSessionData (sign-out / lost till)', () => {
  it("removes the previous user's cart, staff list and POS context, keeps the catalog", async () => {
    usePOSStore.setState({ notes: 'VIP customer, call back', salespersonId: 'u1' });
    expect(localStorage.getItem(POS_CART_KEY)).toContain('VIP customer');
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify([{ id: 'u1', name: 'Ann' }]));
    await offlineCache.saveContext({ taxRate: 0.1 } as unknown as PosContext);
    await offlineCache.saveCatalog('r1', []);

    await clearLocalSessionData();

    expect(usePOSStore.getState().notes).toBe('');
    expect(usePOSStore.getState().salespersonId).toBeNull();
    expect(localStorage.getItem(POS_CART_KEY)).toBeNull();
    expect(localStorage.getItem(STAFF_CACHE_KEY)).toBeNull();
    expect(await offlineCache.loadContext()).toBeUndefined();
    expect(await offlineCache.loadCatalog('r1')).not.toBeNull();
  });
});

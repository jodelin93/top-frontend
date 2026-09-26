'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CatalogItem, posApi } from '@/lib/api/sales';
import { deviceLost } from '@/lib/api/client';
import { normalizeBarcode } from '@/lib/api/products';
import {
  acknowledgedSales,
  AcknowledgedSale,
  deviceStore,
  isLeaseActive,
  leaseClaimsOf,
  offlineCache,
  PendingSale,
  pendingSales,
} from '@/lib/pos/offline-db';
import { assessClock } from '@/lib/pos/offline-guard';
import {
  ensureDevice,
  isNetworkError,
  refreshCatalog,
  renewLease,
  sendHeartbeat,
  storageStatus,
  syncPendingSales,
} from '@/lib/pos/sync';
import { useAuthStore } from '@/stores/auth-store';
import { clearLocalSessionData } from '@/lib/session-cleanup';

// ---- Network mode of the POS queries ----

/**
 * TanStack Query pauses queries while the browser reports itself offline (networkMode
 * 'online', the default). Queries that read the device (IndexedDB, localStorage) or
 * fall back to it on their own must keep running offline, or the till shows an empty
 * catalog, an empty offline queue and no lease while it is offline.
 * - LOCAL_QUERY: always runs (reads local data, or picks local vs. server itself)
 * - LOCAL_FALLBACK_QUERY: tries the server first, falls back to the local copy;
 *   retries of a failed call wait for the connection
 */
export const LOCAL_QUERY = { networkMode: 'always' } as const;
export const LOCAL_FALLBACK_QUERY = { networkMode: 'offlineFirst' } as const;

// ---- Connectivity ----

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true
  );
}

// ---- Lost till ----

/**
 * True once the server refused this till as lost (DEVICE_LOST, see the API client):
 * syncing stops and the POS is blocked until a manager re-enrolls it.
 */
export function useDeviceLost(): boolean {
  return useSyncExternalStore(deviceLost.subscribe, deviceLost.get, () => false);
}

// ---- POS context (settings, registers, payment methods, categories) ----

/**
 * Loads the POS context from the API, falling back to the last cached copy when offline
 */
export function usePosContext() {
  return useQuery({
    queryKey: ['pos', 'context'],
    ...LOCAL_FALLBACK_QUERY,
    queryFn: async () => {
      try {
        const context = await posApi.context();
        await offlineCache.saveContext(context).catch(() => undefined);
        return { ...context, fromCache: false };
      } catch (error) {
        const cached = isNetworkError(error) ? await offlineCache.loadContext() : undefined;
        if (cached) return { ...cached, fromCache: true };
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

// ---- Catalog ----

const matches = (item: CatalogItem, search: string) => {
  const q = search.toLowerCase();
  return (
    item.productName.toLowerCase().includes(q) ||
    item.sku.toLowerCase().includes(q) ||
    (item.variantName ?? '').toLowerCase().includes(q) ||
    (item.barcode ?? '').toLowerCase().includes(q)
  );
};

/**
 * Keeps a copy of the register's catalog in IndexedDB and searches it locally when the
 * API can't be reached. The first load downloads everything; later refreshes only fetch
 * what changed since the stored sync cursor (GET /sync/changes).
 */
export function useCatalog(registerId: string | null, online: boolean) {
  const { data: cached, refetch: refreshCache } = useQuery({
    queryKey: ['pos', 'catalog-cache', registerId],
    ...LOCAL_QUERY,
    enabled: !!registerId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (online) {
        try {
          const { items, savedAt } = await refreshCatalog(registerId!);
          return { items, savedAt };
        } catch (error) {
          if (!isNetworkError(error)) {
            // IndexedDB or sync trouble: fall back to a plain download
            const items = await posApi.catalog({ registerId: registerId!, limit: 500 });
            return { items, savedAt: new Date().toISOString() };
          }
        }
      }
      return (await offlineCache.loadCatalog(registerId!)) ?? { items: [], savedAt: null };
    },
  });

  const search = useCallback(
    async (params: {
      search?: string;
      barcode?: string;
      categoryId?: string;
      // PLU of a weighed label: looked up in the cached catalog only
      plu?: string;
    }): Promise<CatalogItem[]> => {
      // Scans are normalized like stored barcodes (spaces removed, letters upper-cased)
      const code = params.barcode ? normalizeBarcode(params.barcode) : null;
      const local = () =>
        (cached?.items ?? []).filter(
          (item) =>
            (!params.barcode ||
              (!!code && normalizeBarcode(item.barcode) === code) ||
              item.sku === params.barcode.trim()) &&
            (!params.plu || item.pluCode === params.plu) &&
            (!params.search || matches(item, params.search)) &&
            (!params.categoryId || item.categoryId === params.categoryId)
        );

      if (!online || params.plu) return local();
      try {
        return await posApi.catalog({ registerId: registerId ?? undefined, limit: 100, ...params });
      } catch (error) {
        if (isNetworkError(error)) return local();
        throw error;
      }
    },
    [cached, online, registerId]
  );

  // items: the cached catalog (every sellable item of the register), for repricing checks
  return { search, items: cached?.items ?? null, cachedAt: cached?.savedAt ?? null, refreshCache };
}

// ---- Pending offline sales ----

/**
 * Queue of sales recorded offline; uploads them while online (now, and every 30s)
 */
export function usePendingSales(online: boolean) {
  const queryClient = useQueryClient();
  const lost = useDeviceLost();
  const listKey = ['pos', 'pending-sales'];
  const ackKey = ['pos', 'acknowledged-sales'];

  const { data: sales = [] } = useQuery({
    queryKey: listKey,
    ...LOCAL_QUERY,
    queryFn: () => pendingSales.list().catch(() => [] as PendingSale[]),
  });

  // Sales the server has acknowledged (newest first): offline receipt → server sale number
  const { data: acknowledged = [] } = useQuery({
    queryKey: ackKey,
    ...LOCAL_QUERY,
    queryFn: () => acknowledgedSales.list().catch(() => [] as AcknowledgedSale[]),
  });

  const { isFetching: syncing, refetch } = useQuery({
    queryKey: ['pos', 'sync-pending-sales'],
    queryFn: async () => {
      const result = await syncPendingSales();
      await queryClient.invalidateQueries({ queryKey: listKey });
      await queryClient.invalidateQueries({ queryKey: ackKey });
      // Report the new queue size to the server
      if (result.uploaded > 0 || result.failed > 0) {
        await queryClient.invalidateQueries({ queryKey: ['pos', 'heartbeat'] });
      }
      return result;
    },
    // A till marked lost stops uploading (its sales wait for a manager)
    enabled: online && !lost,
    refetchInterval: online && !lost ? 30_000 : false,
    staleTime: 0,
  });

  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: listKey }),
        queryClient.invalidateQueries({ queryKey: ackKey }),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient]
  );

  const sync = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Operations the server answered needs_review (not retried automatically)
  const needsReview = sales.filter((s) => s.error).length;
  return { sales, acknowledged, syncing, sync, refresh, needsReview };
}

// ---- Durable storage ----

/**
 * Browser storage use and quota for the till (low-space warning); checked every
 * few minutes and whenever the queue changes.
 */
export function useStorageStatus(pendingCount: number) {
  const { data } = useQuery({
    queryKey: ['pos', 'storage', pendingCount],
    ...LOCAL_QUERY,
    queryFn: () => storageStatus(),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
  return data ?? null;
}

// ---- Device registration and offline lease ----

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * Registers this till with the server, keeps its offline lease renewed while online
 * and sends heartbeats with the offline queue size.
 *
 * Offline selling is only allowed while the lease is valid: `leaseExpired` turns true
 * when it has run out (or the device was revoked) and `offlineBlocked` when, on top
 * of that, the till is offline.
 */
export function useDeviceLease(online: boolean, registerId: string | null) {
  const tenantId = useAuthStore((state) => state.user?.tenantId ?? null);
  const now = useNow(30_000);
  const queryClient = useQueryClient();
  const lost = useDeviceLost();

  // Marked lost: drop the stored enrollment (id and lease) and the local session data
  // (cart, staff list, POS context; the pending-sales queue is kept); nothing registers
  // again until a manager re-enrolls the till
  useEffect(() => {
    if (!lost) return;
    void clearLocalSessionData();
    void deviceStore
      .forget()
      .catch(() => undefined)
      .then(() => queryClient.removeQueries({ queryKey: ['pos', 'device'] }));
  }, [lost, queryClient]);

  const { data: device = null, isFetched: deviceChecked } = useQuery({
    queryKey: ['pos', 'device', tenantId, online, lost],
    ...LOCAL_QUERY,
    enabled: !!tenantId && !lost,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const stored = (await deviceStore.get().catch(() => undefined)) ?? null;
      if (!online) return stored?.tenantId === tenantId ? stored : null;
      try {
        return await ensureDevice(tenantId!, registerId);
      } catch {
        return stored?.tenantId === tenantId ? stored : null;
      }
    },
  });

  const { data: lease = null, isFetched: leaseChecked } = useQuery({
    queryKey: ['pos', 'lease', device?.id, online, registerId],
    ...LOCAL_QUERY,
    enabled: !!device && !lost,
    retry: false,
    // Renew well before it runs out; offline just re-read the stored lease
    refetchInterval: online ? 15 * 60_000 : 60_000,
    queryFn: async () =>
      online ? await renewLease(device!.id, registerId) : ((await deviceStore.getLease(device!.id)) ?? null),
  });

  // Clock state: a clock that went backwards blocks offline selling until online again
  const { data: clock = null } = useQuery({
    queryKey: ['pos', 'clock', device?.id, online, lease?.checkedAt],
    ...LOCAL_QUERY,
    enabled: !!device,
    refetchInterval: 60_000,
    queryFn: async () => (await deviceStore.getClock().catch(() => undefined)) ?? null,
  });

  useQuery({
    queryKey: ['pos', 'heartbeat', device?.id],
    enabled: online && !!device && !lost,
    retry: false,
    refetchInterval: 60_000,
    queryFn: () => sendHeartbeat(device!.id, registerId).catch(() => null),
  });

  const revoked = !!lease?.revokedAt;
  const leaseExpired = !isLeaseActive(lease, now);
  const claims = leaseClaimsOf(lease);
  const clockProblem = !online && clock ? assessClock(clock, now, claims).problem : null;
  return {
    device: lost ? null : device,
    lease,
    // Marked lost by an administrator: blocked until re-enrolled
    lost,
    leaseExpiresAt: lease?.leaseExpiresAt ?? null,
    revoked,
    // True until a valid lease is known (also before the first check completes)
    leaseExpired,
    leaseChecked,
    // Only once known, so the till doesn't flash a lock while loading
    offlineBlocked: !online && (leaseExpired || !!clockProblem) && deviceChecked && (!device || leaseChecked),
    // The till's clock went backwards while offline
    clockProblem,
    // Offline limits carried by the signed lease
    limits: claims?.lim ?? null,
  };
}

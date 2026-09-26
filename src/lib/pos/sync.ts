import { AxiosError } from 'axios';
import { posApi, type CatalogItem } from '@/lib/api/sales';
import { devicesApi } from '@/lib/api/devices';
import { PUSH_BATCH_SIZE, syncApi, type SyncAck, type SyncOperation } from '@/lib/api/sync';
import { deviceLost, getErrorMessage } from '@/lib/api/client';
import { t } from '@/i18n';
import {
  acknowledgedSales,
  deviceStore,
  mergeCatalog,
  offlineCache,
  OP_SCHEMA_VERSION,
  pendingSales,
  type CachedCatalog,
  type DeviceRecord,
  type LeaseRecord,
  type PendingSale,
} from './offline-db';
import { revalidateClock, retryDelayMs } from './offline-guard';
import { payloadHash } from './payload-hash';

// No response at all means the network (or API) is unreachable, not that the sale is invalid
export const isNetworkError = (error: unknown) => error instanceof AxiosError && !error.response;

// The server answered, but the request may succeed later (overload, signed out, ...)
const isTransient = (error: unknown) => {
  if (isNetworkError(error)) return true;
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return status === undefined || status >= 500 || ![400, 409, 413, 422].includes(status);
};

let syncing: Promise<SyncResult> | null = null;

export interface SyncResult {
  // Acknowledged by the server in this run (accepted or already applied)
  uploaded: number;
  // Operations waiting for a person (needs_review), still on the device
  failed: number;
  // Operations still on the device
  remaining: number;
  // Postponed (pending_dependency or unreachable server), retried with backoff
  deferred: number;
}

const LAST_SYNC_KEY = 'lastSyncAt';
// Whole-queue backoff after the server could not be reached: { attempt, nextAt }
export const PUSH_BACKOFF_KEY = 'pushBackoff';
// Upload retries since the last successful push (reported to the sync dashboard)
const RETRIES_KEY = 'pushRetries';

interface Backoff {
  attempt: number;
  nextAt: string;
}

/** The typed operation envelope POST /sync/push expects for a queued sale. */
export function toOperation(sale: PendingSale): SyncOperation {
  return {
    deviceOperationId: sale.id,
    deviceSequence: sale.deviceSequence ?? 0,
    type: 'sale.create',
    schemaVersion: sale.schemaVersion ?? OP_SCHEMA_VERSION,
    payloadHash: sale.payloadHash ?? payloadHash(sale.input),
    payload: sale.input as unknown as Record<string, unknown>,
    lease: sale.lease ?? undefined,
    actorId: sale.actorId ?? undefined,
    capturedAt: sale.input.offlineCapturedAt ?? sale.createdAt,
    snapshot: (sale.snapshot as unknown as Record<string, unknown>) ?? undefined,
  };
}

/**
 * Upload the operations recorded offline in batches (POST /sync/push), in device
 * sequence order, and apply the server's answer for each one:
 * - accepted / already_applied: the operation leaves the queue and its
 *   acknowledgement (server id + number) is stored in the same IndexedDB
 *   transaction. A lost acknowledgement is harmless: the operation is sent again
 *   and the server answers already_applied (idempotent by operation id).
 * - needs_review: kept, shown with the reason in "Offline sales", not retried
 *   automatically (a manager fixes the cause and retries).
 * - pending_dependency: kept and retried later with exponential backoff; the
 *   following batches wait so the device order is kept.
 * If the server can't be reached, the whole queue waits (backoff with jitter, capped).
 */
export function syncPendingSales(options: { force?: boolean; now?: () => number } = {}): Promise<SyncResult> {
  syncing ??= (async () => {
    const now = options.now ?? Date.now;
    const result: SyncResult = { uploaded: 0, failed: 0, remaining: 0, deferred: 0 };
    let reachedServer = false;
    try {
      // A till marked lost uploads nothing until a manager re-enrolls it
      if (deviceLost.get()) {
        result.remaining = (await pendingSales.list().catch(() => [])).length;
        return result;
      }
      const backoff = await deviceStore.getMeta<Backoff>(PUSH_BACKOFF_KEY).catch(() => undefined);
      const waiting = !options.force && backoff && Date.parse(backoff.nextAt) > now();
      const due = (await pendingSales.list()).filter(
        (s) => !s.error && (options.force || !s.nextAttemptAt || Date.parse(s.nextAttemptAt) <= now())
      );
      if (!waiting && due.length === 0) reachedServer = true;
      if (!waiting && due.length > 0) {
        const device = await deviceStore.get().catch(() => undefined);
        let failure: unknown = null;
        for (let i = 0; i < due.length; i += PUSH_BATCH_SIZE) {
          const batch = due.slice(i, i + PUSH_BATCH_SIZE);
          try {
            const response = await syncApi.push({
              deviceId: device?.id ?? batch[0].deviceId,
              operations: batch.map(toOperation),
            });
            reachedServer = true;
            const counts = await pendingSales.applyAcks(response.results, now());
            result.uploaded += counts.acknowledged;
            result.deferred += counts.deferred;
            // Something must go first: keep the rest of the queue in order
            if (counts.deferred > 0) break;
          } catch (error) {
            if (isTransient(error)) {
              failure = error;
              result.deferred += due.length - i;
              break;
            }
            // The batch itself was refused (malformed operation): each one needs review
            reachedServer = true;
            await pendingSales.applyAcks(
              batch.map((s) => ({
                deviceOperationId: s.id,
                status: 'needs_review' as const,
                reason: getErrorMessage(error, 'The server rejected this sale'),
              })),
              now()
            );
          }
        }
        if (failure) {
          const attempt = (backoff?.attempt ?? -1) + 1;
          await deviceStore
            .setMeta(PUSH_BACKOFF_KEY, {
              attempt,
              nextAt: new Date(now() + retryDelayMs(attempt)).toISOString(),
            } satisfies Backoff)
            .catch(() => undefined);
          const retries = ((await deviceStore.getMeta<number>(RETRIES_KEY).catch(() => 0)) ?? 0) + 1;
          await deviceStore.setMeta(RETRIES_KEY, retries).catch(() => undefined);
        } else {
          await deviceStore.setMeta(PUSH_BACKOFF_KEY, null).catch(() => undefined);
          await deviceStore.setMeta(RETRIES_KEY, 0).catch(() => undefined);
        }
      }
      const queue = await pendingSales.list();
      result.remaining = queue.length;
      result.failed = queue.filter((s) => s.error).length;
      if (reachedServer) {
        await deviceStore.setMeta(LAST_SYNC_KEY, new Date(now()).toISOString()).catch(() => undefined);
        await acknowledgedSales.prune().catch(() => 0);
      }
      return result;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/**
 * Put a needs_review operation back in the queue (after fixing the cause, e.g.
 * re-creating a register) and upload it now
 */
export async function retryPendingSale(id: string) {
  const sale = (await pendingSales.list()).find((s) => s.id === id);
  if (sale) {
    await pendingSales.update({ ...sale, error: undefined, nextAttemptAt: null });
  }
  return syncPendingSales({ force: true });
}

// ---- Device registration, heartbeat and signed offline lease ----

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/**
 * Register this browser as a till of the store (once per store; later calls refresh
 * the registration). The id is kept in IndexedDB and localStorage.
 */
export async function ensureDevice(tenantId: string, registerId?: string | null): Promise<DeviceRecord> {
  const existing = await deviceStore.get();
  const sameStore = existing?.tenantId === tenantId ? existing : undefined;
  const registered = await devicesApi.register({
    deviceId: sameStore?.id,
    registerId: registerId ?? undefined,
    appVersion: APP_VERSION,
  });
  const device: DeviceRecord = {
    id: registered.id,
    tenantId,
    name: registered.name,
    registeredAt: registered.registeredAt,
  };
  await deviceStore.save(device);
  if (registered.revokedAt) {
    await deviceStore.saveLease(device.id, {
      leaseExpiresAt: null,
      revokedAt: registered.revokedAt,
      checkedAt: new Date().toISOString(),
    });
  }
  // Keep the offline queue safe from browser storage eviction
  await requestPersistentStorage();
  return device;
}

const isRevokedError = (error: unknown) =>
  error instanceof AxiosError &&
  error.response?.status === 403 &&
  (error.response.data as { code?: string } | undefined)?.code === 'DEVICE_REVOKED';

/** The server told us the time: the clock watermark follows it and a clock block is lifted. */
async function trustServerTime(serverTime: string | undefined) {
  const serverMs = serverTime ? Date.parse(serverTime) : NaN;
  if (Number.isNaN(serverMs)) return;
  const clock = await deviceStore.getClock().catch(() => undefined);
  await deviceStore.saveClock(revalidateClock(clock, serverMs, Date.now())).catch(() => undefined);
}

/**
 * Obtain / renew the signed offline lease (online only). Offline, or if the server
 * can't be reached, the last stored lease stays in force until it expires.
 */
export async function renewLease(deviceId: string, registerId?: string | null): Promise<LeaseRecord | null> {
  const checkedAt = new Date().toISOString();
  try {
    const lease = await devicesApi.lease(deviceId, registerId);
    const record: LeaseRecord = {
      leaseExpiresAt: lease.leaseExpiresAt,
      revokedAt: null,
      checkedAt,
      token: lease.lease ?? null,
      claims: lease.leaseClaims ?? null,
    };
    await deviceStore.saveLease(deviceId, record);
    await trustServerTime(lease.serverTime);
    return record;
  } catch (error) {
    if (isRevokedError(error)) {
      const record: LeaseRecord = { leaseExpiresAt: null, revokedAt: checkedAt, checkedAt };
      await deviceStore.saveLease(deviceId, record);
      return record;
    }
    return (await deviceStore.getLease(deviceId)) ?? null;
  }
}

/** Tell the server this till is alive and what its sync queue holds. */
export async function sendHeartbeat(deviceId: string, registerId?: string | null) {
  const queue = await pendingSales.list();
  const oldest = queue.reduce<string | null>(
    (min, s) => (!min || s.createdAt < min ? s.createdAt : min),
    null
  );
  const response = await devicesApi.heartbeat(deviceId, {
    pendingSales: queue.length,
    failedSales: queue.filter((s) => s.error).length,
    lastSequence: await deviceStore.lastSequence(deviceId),
    registerId: registerId ?? undefined,
    lastSyncAt: await deviceStore.getMeta<string>(LAST_SYNC_KEY),
    oldestPendingAt: oldest ?? undefined,
    pendingAmount: Math.round(queue.reduce((sum, s) => sum + s.total, 0) * 100) / 100,
    syncRetries: (await deviceStore.getMeta<number>(RETRIES_KEY).catch(() => 0)) ?? 0,
  });
  const checkedAt = new Date().toISOString();
  if (response.revokedAt) {
    await deviceStore.saveLease(deviceId, { leaseExpiresAt: null, revokedAt: response.revokedAt, checkedAt });
  } else if (response.lease) {
    await deviceStore.saveLease(deviceId, {
      leaseExpiresAt: response.leaseExpiresAt,
      revokedAt: null,
      checkedAt,
      token: response.lease,
      claims: response.leaseClaims ?? null,
    });
  }
  await trustServerTime(response.serverTime);
  return response;
}

// ---- Durable browser storage ----

// Warn when less than this is left, or the origin uses more than this share of its quota
export const LOW_STORAGE_BYTES = 50 * 1024 * 1024;
export const LOW_STORAGE_RATIO = 0.9;

export interface StorageStatus {
  usage: number;
  quota: number;
  low: boolean;
  persisted: boolean | null;
}

export const isStorageLow = (usage: number, quota: number) =>
  quota > 0 && (quota - usage < LOW_STORAGE_BYTES || usage / quota > LOW_STORAGE_RATIO);

/** Ask the browser not to evict this site's data (offline queue). null: not supported. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function storageStatus(): Promise<StorageStatus | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    return { usage, quota, low: isStorageLow(usage, quota), persisted };
  } catch {
    return null;
  }
}

// ---- Export / import of unsynced sales (dead till) ----

export const EXPORT_FORMAT = 'modern-pos-unsynced-sales';

export interface UnsyncedExport {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  device: { id: string; name: string; tenantId: string } | null;
  count: number;
  total: number;
  operations: SyncOperation[];
}

/** Every operation still on this till (needs_review included), as a file's content. */
export async function buildExport(): Promise<UnsyncedExport> {
  const [device, queue] = await Promise.all([deviceStore.get().catch(() => undefined), pendingSales.list()]);
  return {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    device: device ? { id: device.id, name: device.name, tenantId: device.tenantId } : null,
    count: queue.length,
    total: Math.round(queue.reduce((sum, s) => sum + s.total, 0) * 100) / 100,
    operations: queue.map(toOperation),
  };
}

export function parseExport(text: string): UnsyncedExport {
  let value: Partial<UnsyncedExport>;
  try {
    value = JSON.parse(text) as Partial<UnsyncedExport>;
  } catch {
    throw new Error(t('This file is not an export of unsynced sales.'));
  }
  if (value?.format !== EXPORT_FORMAT || !Array.isArray(value.operations)) {
    throw new Error(t('This file is not an export of unsynced sales.'));
  }
  return value as UnsyncedExport;
}

/** Upload an export file through POST /sync/import (same processing as a push). */
export async function importExport(file: UnsyncedExport, deviceId?: string): Promise<SyncAck[]> {
  const target = deviceId ?? file.device?.id;
  if (!target) throw new Error(t('Choose the till these sales come from.'));
  const ordered = [...file.operations].sort((a, b) => a.deviceSequence - b.deviceSequence);
  const acks: SyncAck[] = [];
  for (let i = 0; i < ordered.length; i += PUSH_BATCH_SIZE) {
    const response = await syncApi.import({ deviceId: target, operations: ordered.slice(i, i + PUSH_BATCH_SIZE) });
    acks.push(...response.results);
  }
  return acks;
}

// ---- Catalog: full download, then incremental changes ----

// A full download is repeated this often anyway
const FULL_REFRESH_MS = 12 * 3600_000;
const MAX_PAGES = 20;
const FULL_LIMIT = 500;

export interface CatalogRefresh extends CachedCatalog {
  mode: 'full' | 'incremental';
}

async function fullDownload(registerId: string): Promise<CatalogRefresh> {
  // Take the cursor first (the server's snapshot boundary), so nothing changing
  // during the download is missed; changes in between come again as deltas
  let cursor: string | null = null;
  try {
    cursor = (await syncApi.changes({ registerId })).cursor;
  } catch (error) {
    if (isNetworkError(error)) throw error;
    // Older server or no access to /sync: plain download without a cursor
  }
  const items = await posApi.catalog({ registerId, limit: FULL_LIMIT });
  await offlineCache.saveCatalog(registerId, items, cursor);
  await deviceStore.setMeta(`catalogFullAt:${registerId}`, new Date().toISOString()).catch(() => undefined);
  return { items, savedAt: new Date().toISOString(), cursor, mode: 'full' };
}

/**
 * Bring the cached catalog of a register up to date: the first time (or when the
 * server asks for it, or twice a day) a full download, otherwise only what changed
 * since the stored opaque cursor (tombstones remove items). Also refreshes the
 * cached POS context when it changed.
 */
export async function refreshCatalog(registerId: string): Promise<CatalogRefresh> {
  const cached = await offlineCache.loadCatalog(registerId);
  const fullAt = await deviceStore.getMeta<string>(`catalogFullAt:${registerId}`).catch(() => undefined);
  const due = !fullAt || Date.now() - Date.parse(fullAt) > FULL_REFRESH_MS;
  if (!cached?.cursor || due) return fullDownload(registerId);

  let items: CatalogItem[] = cached.items;
  let cursor = cached.cursor;
  for (let page = 0; page < MAX_PAGES; page++) {
    const changes = await syncApi.changes({ cursor, registerId });
    if (changes.reset) return fullDownload(registerId);
    items = mergeCatalog(items, changes.items, changes.removedVariantIds);
    if (changes.context) await offlineCache.saveContext(changes.context).catch(() => undefined);
    cursor = changes.cursor;
    if (!changes.hasMore) break;
  }
  await offlineCache.saveCatalog(registerId, items, cursor);
  return { items, savedAt: new Date().toISOString(), cursor, mode: 'incremental' };
}

/**
 * Full resnapshot: forget every cached catalog and cursor, then download again.
 * Queued (unacknowledged) sales are kept.
 */
export async function resnapshotCatalog(registerId: string): Promise<CatalogRefresh> {
  await offlineCache.clearCatalogs();
  return fullDownload(registerId);
}

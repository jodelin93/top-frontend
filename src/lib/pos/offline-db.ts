/**
 * IndexedDB storage for offline POS use:
 * - `cache`: last known POS context and catalog, so the till works without a connection
 * - `pendingSales`: sync operations (sales rung up offline) waiting to be acknowledged
 * - `acknowledged`: sales the server has confirmed (offline receipt → server sale number)
 * - `meta`: this till's device registration, signed offline lease, clock state, sale
 *   sequence, lease usage and sync cursors
 *
 * Local persistence contract (spec §19): an offline sale is written in ONE
 * transaction together with its sequence number, lease usage and clock state, with
 * its pricing/policy snapshot, payload hash, schema version and actor. If that
 * transaction fails the sale is not complete (the caller keeps the cart).
 */
import { DEVICE_ID_KEY } from '@/lib/api/client';
import type { CreateSaleInput, PosContext, CatalogItem } from '@/lib/api/sales';
import { t } from '@/i18n';
import { payloadHash } from './payload-hash';
import {
  assessClock,
  checkOfflineLimits,
  decodeLeaseToken,
  retryDelayMs,
  type ClockState,
  type LeaseClaims,
  type LeaseUsage,
} from './offline-guard';

const DB_NAME = 'modern-pos';
// v1: cache/pendingSales/meta, v2: acknowledged, v3: sync-operation fields on pending sales
export const DB_VERSION = 3;
// Payload schema of sale operations sent to POST /sync/push
export const OP_SCHEMA_VERSION = 1;

// Prices, tax and policies the till used for an offline sale (kept for review)
export interface SaleSnapshot {
  currencyCode: string;
  taxRate: number;
  pricesIncludeTax: boolean;
  maxDiscountPercent: number | null;
  exchangeRates: Record<string, number>;
  settingsVersion: number | null;
  discount: { code: string; type?: string; value?: number } | null;
  cartDiscount: { type: string; value: number } | null;
  lines: {
    variantId: string;
    unitPrice: number;
    catalogPrice: number | null;
    discountPercent: number;
    taxRate: number | null;
  }[];
}

export interface PendingSale {
  // Same value as input.idempotencyKey (= the operation id), so re-uploading can
  // never duplicate the sale
  id: string;
  input: CreateSaleInput;
  createdAt: string;
  // Totals as shown to the customer, for the offline receipt and review screen
  total: number;
  attempts: number;
  // Set when the server answered needs_review: the reason; not retried automatically
  error?: string;
  // Till that recorded the sale and its per-device sequence number (1, 2, 3...)
  deviceId?: string;
  deviceSequence?: number;
  // ---- v3 ----
  schemaVersion?: number;
  // sha256 of the canonical JSON of `input`
  payloadHash?: string;
  // Cashier who rang it up
  actorId?: string | null;
  snapshot?: SaleSnapshot | null;
  // Signed lease the sale was made under
  lease?: string | null;
  leaseId?: string | null;
  // Monotonic clock counter at capture
  clockCounter?: number;
  // Waiting (pending_dependency / transient error) until this time
  nextAttemptAt?: string | null;
  lastAttemptAt?: string | null;
}

export type NewPendingSale = Pick<PendingSale, 'id' | 'input' | 'createdAt' | 'total'> & {
  attempts?: number;
  snapshot: SaleSnapshot;
  actorId: string | null;
};

// A pending sale the server has acknowledged (kept a while for receipt lookups)
export interface AcknowledgedSale {
  id: string;
  saleId: string;
  saleNumber: string;
  total: number;
  createdAt: string;
  acknowledgedAt: string;
  deviceSequence?: number;
}

export interface DeviceRecord {
  id: string;
  tenantId: string;
  name: string;
  registeredAt: string;
}

export interface LeaseRecord {
  leaseExpiresAt: string | null;
  revokedAt: string | null;
  checkedAt: string;
  // Signed lease (POST /devices/:id/lease or heartbeat) and its claims
  token?: string | null;
  claims?: LeaseClaims | null;
}

// Offline selling is not allowed (lease expired, device revoked, clock, limits...)
export class OfflineLeaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineLeaseError';
  }
}

// Server answer for one operation of a push
export interface OperationAck {
  deviceOperationId: string;
  status: 'accepted' | 'already_applied' | 'pending_dependency' | 'needs_review';
  saleId?: string;
  saleNumber?: string;
  reason?: string | null;
}

// Acknowledged sales are kept this long / at most this many
const ACK_RETENTION_MS = 7 * 24 * 3600_000;
const ACK_MAX = 500;

let dbPromise: Promise<IDBDatabase> | null = null;

/** Bring stored records up to the current schema (runs inside the upgrade transaction). */
function migrate(tx: IDBTransaction, oldVersion: number) {
  if (oldVersion > 0 && oldVersion < 3) {
    // Pending sales from before v3 become sync operations
    const store = tx.objectStore('pendingSales');
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const sale = cursor.value as PendingSale;
      cursor.update({
        ...sale,
        schemaVersion: sale.schemaVersion ?? OP_SCHEMA_VERSION,
        payloadHash: sale.payloadHash ?? payloadHash(sale.input),
        actorId: sale.actorId ?? null,
        snapshot: sale.snapshot ?? null,
        lease: sale.lease ?? null,
        leaseId: sale.leaseId ?? null,
        nextAttemptAt: sale.nextAttemptAt ?? null,
      } satisfies PendingSale);
      cursor.continue();
    };
  }
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache');
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('acknowledged')) {
        db.createObjectStore('acknowledged', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      migrate(request.transaction!, event.oldVersion);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgraded the schema: let it, reopen on next use
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

/** Tests: forget the open connection (a fresh IDBFactory is installed between tests). */
export async function resetOfflineDbForTests() {
  const db = await dbPromise?.catch(() => null);
  db?.close();
  dbPromise = null;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = fn(db.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      })
  );
}

const read = <T>(request: IDBRequest) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });

// Resolves when a multi-store transaction commits
const committed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });

// ---- Cached POS data ----

const contextKey = 'context';
const catalogKey = (registerId: string) => `catalog:${registerId}`;

export interface CachedCatalog {
  items: CatalogItem[];
  savedAt: string;
  // Sync cursor (GET /sync/changes) the catalog is current up to
  cursor?: string | null;
}

export const offlineCache = {
  saveContext: (context: PosContext) => run('cache', 'readwrite', (s) => s.put(context, contextKey)),
  loadContext: () => run<PosContext | undefined>('cache', 'readonly', (s) => s.get(contextKey)),
  /** Sign-out / lost till: forget the store context (settings, registers, payment methods). */
  clearContext: () => run('cache', 'readwrite', (s) => s.delete(contextKey)),
  saveCatalog: (registerId: string, items: CatalogItem[], cursor?: string | null) =>
    run('cache', 'readwrite', (s) =>
      s.put({ items, savedAt: new Date().toISOString(), cursor: cursor ?? null }, catalogKey(registerId))
    ),
  loadCatalog: async (registerId: string) =>
    (await run<CachedCatalog | undefined>('cache', 'readonly', (s) => s.get(catalogKey(registerId)))) ?? null,
  /**
   * Full resnapshot: drop every cached catalog and its cursor. Queued sales and
   * acknowledgements are in other stores and are never touched.
   */
  clearCatalogs: async () => {
    const keys = await run<IDBValidKey[]>('cache', 'readonly', (s) => s.getAllKeys());
    const stale = keys.filter((k) => typeof k === 'string' && k.startsWith('catalog:'));
    const db = await openDb();
    const tx = db.transaction(['cache', 'meta'], 'readwrite');
    const done = committed(tx);
    for (const key of stale) {
      tx.objectStore('cache').delete(key);
      tx.objectStore('meta').delete(`catalogFullAt:${String(key).slice('catalog:'.length)}`);
    }
    await done;
    return stale.length;
  },
};

/** Apply incremental changes to a cached catalog (upsert changed items, drop removed ones). */
export function mergeCatalog(items: CatalogItem[], changed: CatalogItem[], removedIds: string[]): CatalogItem[] {
  const byId = new Map(items.map((item) => [item.variantId, item]));
  for (const id of removedIds) byId.delete(id);
  for (const item of changed) byId.set(item.variantId, item);
  return [...byId.values()].sort((a, b) => a.productName.localeCompare(b.productName));
}

// ---- Device, lease, clock and sequence ----

const leaseKey = (deviceId: string) => `lease:${deviceId}`;
const sequenceKey = (deviceId: string) => `seq:${deviceId}`;
const usageKey = (deviceId: string) => `leaseUsage:${deviceId}`;
export const CLOCK_KEY = 'clock';

export function isLeaseActive(lease: LeaseRecord | null | undefined, now = Date.now()): boolean {
  return !!lease && !lease.revokedAt && !!lease.leaseExpiresAt && Date.parse(lease.leaseExpiresAt) > now;
}

export const leaseClaimsOf = (lease: LeaseRecord | null | undefined) =>
  lease?.claims ?? decodeLeaseToken(lease?.token) ?? null;

export const deviceStore = {
  get: () => run<DeviceRecord | undefined>('meta', 'readonly', (s) => s.get('device')),
  save: async (device: DeviceRecord) => {
    await run('meta', 'readwrite', (s) => s.put(device, 'device'));
    try {
      localStorage.setItem(DEVICE_ID_KEY, device.id);
    } catch {
      // Storage unavailable: the header is only informational
    }
  },
  /** Drop the enrollment (device marked lost): its id and lease. The offline queue is kept. */
  forget: async () => {
    const device = await run<DeviceRecord | undefined>('meta', 'readonly', (s) => s.get('device'));
    if (device) await run('meta', 'readwrite', (s) => s.delete(leaseKey(device.id)));
    await run('meta', 'readwrite', (s) => s.delete('device'));
  },
  getLease: (deviceId: string) => run<LeaseRecord | undefined>('meta', 'readonly', (s) => s.get(leaseKey(deviceId))),
  saveLease: (deviceId: string, lease: LeaseRecord) =>
    run('meta', 'readwrite', (s) => s.put(lease, leaseKey(deviceId))),
  getClock: () => run<ClockState | undefined>('meta', 'readonly', (s) => s.get(CLOCK_KEY)),
  saveClock: (clock: ClockState) => run('meta', 'readwrite', (s) => s.put(clock, CLOCK_KEY)),
  getUsage: (deviceId: string) => run<LeaseUsage | undefined>('meta', 'readonly', (s) => s.get(usageKey(deviceId))),
  // Highest sequence handed out on this device
  lastSequence: async (deviceId: string) =>
    (await run<number | undefined>('meta', 'readonly', (s) => s.get(sequenceKey(deviceId)))) ?? 0,
  getMeta: <T>(key: string) => run<T | undefined>('meta', 'readonly', (s) => s.get(key)),
  setMeta: (key: string, value: unknown) => run('meta', 'readwrite', (s) => s.put(value, key)),
};

const money = (n: number) => n.toFixed(2);

// ---- Pending (offline) sales ----

export const pendingSales = {
  /**
   * Queue an offline sale, in one transaction with the device sequence, the lease
   * usage and the clock state. Refused (OfflineLeaseError, nothing written) when the
   * till has no valid lease, its clock went backwards, or the sale is beyond the
   * lease's offline limits.
   */
  add: async (sale: NewPendingSale): Promise<PendingSale> => {
    const db = await openDb();
    const tx = db.transaction(['meta', 'pendingSales'], 'readwrite');
    const done = committed(tx);
    const meta = tx.objectStore('meta');
    const refuse = async (message: string, keep?: () => void) => {
      if (keep) {
        // Commit what must be remembered (the clock block), without the sale
        keep();
        await done;
      } else {
        tx.abort();
        await done.catch(() => undefined);
      }
      throw new OfflineLeaseError(message);
    };

    const device = await read<DeviceRecord | undefined>(meta.get('device'));
    const lease = device ? await read<LeaseRecord | undefined>(meta.get(leaseKey(device.id))) : undefined;
    if (!device || !isLeaseActive(lease)) {
      return refuse(
        !device
          ? t('This till has not been registered yet. Connect to the internet once to enable offline selling.')
          : lease?.revokedAt
            ? t('This till was revoked by an administrator and cannot sell offline.')
            : t('Offline selling has expired on this till. Reconnect to the internet to continue selling.')
      );
    }
    const claims = leaseClaimsOf(lease);

    const clock = assessClock(await read<ClockState | undefined>(meta.get(CLOCK_KEY)), Date.now(), claims);
    if (clock.problem) {
      return refuse(
        t(
          "This till's clock went backwards. Reconnect to the internet to check the time before selling offline again."
        ),
        () => meta.put(clock.next, CLOCK_KEY)
      );
    }

    const stored = await read<LeaseUsage | undefined>(meta.get(usageKey(device.id)));
    const usage: LeaseUsage =
      claims && stored?.leaseId === claims.jti ? stored : { leaseId: claims?.jti ?? '', count: 0, total: 0 };
    const limit = checkOfflineLimits(claims?.lim, usage, sale.total);
    if (limit) {
      return refuse(
        limit === 'over_sale_amount'
          ? t('This sale is above the offline limit of {amount} per sale. Reconnect to the internet to complete it.', {
              amount: money(claims!.lim.maxSaleAmount),
            })
          : limit === 'over_sales_count'
            ? t(
                'This till has reached its limit of {count} offline sales. Reconnect to the internet to continue selling.',
                {
                  count: String(claims!.lim.maxSales),
                }
              )
            : t(
                'This till has reached its offline sales limit of {amount}. Reconnect to the internet to continue selling.',
                {
                  amount: money(claims!.lim.maxTotal),
                }
              )
      );
    }

    const sequence = ((await read<number | undefined>(meta.get(sequenceKey(device.id)))) ?? 0) + 1;
    const input: CreateSaleInput = {
      ...sale.input,
      deviceId: device.id,
      deviceSequence: sequence,
    };
    const record: PendingSale = {
      id: sale.id,
      input,
      createdAt: sale.createdAt,
      total: sale.total,
      attempts: sale.attempts ?? 0,
      deviceId: device.id,
      deviceSequence: sequence,
      schemaVersion: OP_SCHEMA_VERSION,
      payloadHash: payloadHash(input),
      actorId: sale.actorId,
      snapshot: sale.snapshot,
      lease: lease?.token ?? null,
      leaseId: claims?.jti ?? null,
      clockCounter: clock.next.counter,
      nextAttemptAt: null,
      lastAttemptAt: null,
    };
    try {
      // The sale first: if it can't be stored (e.g. DataCloneError), nothing else is
      tx.objectStore('pendingSales').put(record);
      meta.put(sequence, sequenceKey(device.id));
      meta.put(clock.next, CLOCK_KEY);
      meta.put(
        {
          leaseId: usage.leaseId,
          count: usage.count + 1,
          total: Math.round((usage.total + sale.total) * 100) / 100,
        },
        usageKey(device.id)
      );
    } catch (error) {
      // A synchronous failure would otherwise let the transaction commit the rest
      tx.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
    return record;
  },
  list: async () =>
    (await run<PendingSale[]>('pendingSales', 'readonly', (s) => s.getAll())).sort(
      (a, b) =>
        (a.deviceSequence ?? Number.MAX_SAFE_INTEGER) - (b.deviceSequence ?? Number.MAX_SAFE_INTEGER) ||
        a.createdAt.localeCompare(b.createdAt)
    ),
  update: (sale: PendingSale) => run('pendingSales', 'readwrite', (s) => s.put(sale)),
  remove: (id: string) => run('pendingSales', 'readwrite', (s) => s.delete(id)),
  /**
   * The server acknowledged the sale: record the acknowledgement and remove it from
   * the queue in one transaction (a crash can't lose it or leave both).
   */
  acknowledge: async (sale: PendingSale, ack: { saleId: string; saleNumber: string }) => {
    const db = await openDb();
    const tx = db.transaction(['pendingSales', 'acknowledged'], 'readwrite');
    const done = committed(tx);
    const record = acknowledgement(sale, ack);
    tx.objectStore('acknowledged').put(record);
    tx.objectStore('pendingSales').delete(sale.id);
    await done;
    return record;
  },
  /**
   * Apply the per-operation answers of a push in one transaction: acknowledged
   * operations leave the queue, needs_review ones keep their reason (no automatic
   * retry), pending_dependency ones wait with exponential backoff.
   */
  applyAcks: async (acks: OperationAck[], now = Date.now(), random: () => number = Math.random) => {
    const db = await openDb();
    const tx = db.transaction(['pendingSales', 'acknowledged'], 'readwrite');
    const done = committed(tx);
    const queue = tx.objectStore('pendingSales');
    const counts = { acknowledged: 0, needsReview: 0, deferred: 0 };
    try {
      for (const ack of acks) {
        const sale = await read<PendingSale | undefined>(queue.get(ack.deviceOperationId));
        if (!sale) continue;
        const attempted = {
          ...sale,
          attempts: sale.attempts + 1,
          lastAttemptAt: new Date(now).toISOString(),
        };
        if ((ack.status === 'accepted' || ack.status === 'already_applied') && ack.saleId) {
          tx.objectStore('acknowledged').put(
            acknowledgement(sale, { saleId: ack.saleId, saleNumber: ack.saleNumber ?? ack.saleId }, now)
          );
          queue.delete(sale.id);
          counts.acknowledged++;
        } else if (ack.status === 'needs_review') {
          queue.put({
            ...attempted,
            error: ack.reason || t('The server rejected this sale'),
            nextAttemptAt: null,
          });
          counts.needsReview++;
        } else {
          queue.put({
            ...attempted,
            nextAttemptAt: new Date(now + retryDelayMs(sale.attempts, random)).toISOString(),
          });
          counts.deferred++;
        }
      }
    } catch (error) {
      tx.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
    return counts;
  },
};

function acknowledgement(
  sale: PendingSale,
  ack: { saleId: string; saleNumber: string },
  now = Date.now()
): AcknowledgedSale {
  return {
    id: sale.id,
    saleId: ack.saleId,
    saleNumber: ack.saleNumber,
    total: sale.total,
    createdAt: sale.createdAt,
    acknowledgedAt: new Date(now).toISOString(),
    deviceSequence: sale.deviceSequence,
  };
}

export const acknowledgedSales = {
  list: async () =>
    (await run<AcknowledgedSale[]>('acknowledged', 'readonly', (s) => s.getAll())).sort((a, b) =>
      b.acknowledgedAt.localeCompare(a.acknowledgedAt)
    ),
  // Server sale for an offline receipt (id = the offline sale's idempotency key)
  get: (id: string) => run<AcknowledgedSale | undefined>('acknowledged', 'readonly', (s) => s.get(id)),
  // Drop old acknowledgements
  prune: async (now = Date.now()) => {
    const all = await acknowledgedSales.list();
    const stale = all.filter((a, index) => index >= ACK_MAX || now - Date.parse(a.acknowledgedAt) > ACK_RETENTION_MS);
    await Promise.all(stale.map((a) => run('acknowledged', 'readwrite', (s) => s.delete(a.id))));
    return stale.length;
  },
};

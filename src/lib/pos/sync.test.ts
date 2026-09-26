import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogItem } from '@/lib/api/sales';
import type { SyncAck, SyncOperation } from '@/lib/api/sync';
import type { AcknowledgedSale, CachedCatalog, OperationAck, PendingSale } from './offline-db';
import { payloadHash } from './payload-hash';

// In-memory stand-in for the IndexedDB stores
const db = vi.hoisted(() => ({
  sales: new Map<string, PendingSale>(),
  acks: new Map<string, AcknowledgedSale>(),
  meta: new Map<string, unknown>(),
  catalogs: new Map<string, CachedCatalog>(),
}));

vi.mock('./offline-db', async (importOriginal) => ({
  mergeCatalog: (await importOriginal<typeof import('./offline-db')>()).mergeCatalog,
  OP_SCHEMA_VERSION: 1,
  acknowledgedSales: { prune: vi.fn(async () => 0) },
  deviceStore: {
    get: vi.fn(async () => ({ id: 'd1', tenantId: 't1', name: 'Till 1', registeredAt: '' })),
    getMeta: vi.fn(async (key: string) => db.meta.get(key)),
    setMeta: vi.fn(async (key: string, value: unknown) => {
      db.meta.set(key, value);
    }),
  },
  offlineCache: {
    loadCatalog: vi.fn(async (registerId: string) => db.catalogs.get(registerId) ?? null),
    saveCatalog: vi.fn(async (registerId: string, items: CatalogItem[], cursor?: string | null) => {
      db.catalogs.set(registerId, { items, savedAt: 'now', cursor: cursor ?? null });
    }),
    saveContext: vi.fn(async () => undefined),
    clearCatalogs: vi.fn(async () => {
      const count = db.catalogs.size;
      db.catalogs.clear();
      return count;
    }),
  },
  pendingSales: {
    list: vi.fn(async () =>
      [...db.sales.values()]
        .sort((a, b) => (a.deviceSequence ?? 0) - (b.deviceSequence ?? 0))
        .map((s) => ({ ...s }))
    ),
    update: vi.fn(async (sale: PendingSale) => {
      db.sales.set(sale.id, { ...sale });
    }),
    // Same semantics as the IndexedDB version (tested in offline-db.test.ts)
    applyAcks: vi.fn(async (acks: OperationAck[], now = Date.now()) => {
      const counts = { acknowledged: 0, needsReview: 0, deferred: 0 };
      for (const ack of acks) {
        const sale = db.sales.get(ack.deviceOperationId);
        if (!sale) continue;
        if ((ack.status === 'accepted' || ack.status === 'already_applied') && ack.saleId) {
          db.acks.set(sale.id, {
            id: sale.id,
            saleId: ack.saleId,
            saleNumber: ack.saleNumber ?? ack.saleId,
            total: sale.total,
            createdAt: sale.createdAt,
            acknowledgedAt: 'now',
          });
          db.sales.delete(sale.id);
          counts.acknowledged++;
        } else if (ack.status === 'needs_review') {
          db.sales.set(sale.id, { ...sale, attempts: sale.attempts + 1, error: ack.reason ?? 'rejected' });
          counts.needsReview++;
        } else {
          db.sales.set(sale.id, {
            ...sale,
            attempts: sale.attempts + 1,
            nextAttemptAt: new Date(now + 60_000).toISOString(),
          });
          counts.deferred++;
        }
      }
      return counts;
    }),
  },
}));

vi.mock('@/lib/api/sales', () => ({
  posApi: { catalog: vi.fn() },
}));

vi.mock('@/lib/api/sync', () => ({
  PUSH_BATCH_SIZE: 2,
  syncApi: { changes: vi.fn(), push: vi.fn(), import: vi.fn() },
}));

const { posApi } = await import('@/lib/api/sales');
const { syncApi } = await import('@/lib/api/sync');
const {
  buildExport,
  importExport,
  parseExport,
  PUSH_BACKOFF_KEY,
  refreshCatalog,
  resnapshotCatalog,
  retryPendingSale,
  syncPendingSales,
  toOperation,
} = await import('./sync');

const push = vi.mocked(syncApi.push);
const changes = vi.mocked(syncApi.changes);
const fullCatalog = vi.mocked(posApi.catalog);

const pending = (id: string, seq: number, extra: Partial<PendingSale> = {}): PendingSale => {
  const input = { registerId: 'r1', items: [], payments: [], idempotencyKey: id, deviceId: 'd1', deviceSequence: seq };
  return {
    id,
    input,
    createdAt: `2026-09-24T10:0${seq}:00Z`,
    total: 10,
    attempts: 0,
    deviceId: 'd1',
    deviceSequence: seq,
    schemaVersion: 1,
    payloadHash: payloadHash(input),
    actorId: 'u1',
    lease: 'lease.token',
    ...extra,
  };
};

const seed = (...sales: PendingSale[]) => sales.forEach((s) => db.sales.set(s.id, s));

const networkError = () => new AxiosError('Network Error', AxiosError.ERR_NETWORK);

const httpError = (status: number, message: string | string[]) => {
  const response = {
    status,
    statusText: 'Error',
    data: { message },
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${status}`, 'ERR', undefined, null, response);
};

// Server that accepts everything
const acceptAll = async ({ operations }: { operations: SyncOperation[] }) => ({
  serverTime: 'now',
  results: operations.map(
    (op): SyncAck => ({
      deviceOperationId: op.deviceOperationId,
      deviceSequence: op.deviceSequence,
      status: 'accepted',
      saleId: `srv-${op.deviceOperationId}`,
      saleNumber: `S-${op.deviceOperationId}`,
    })
  ),
});

beforeEach(() => {
  db.sales.clear();
  db.acks.clear();
  db.meta.clear();
  db.catalogs.clear();
  vi.clearAllMocks();
});

describe('toOperation', () => {
  it('wraps a queued sale in the typed envelope', () => {
    const sale = pending('a', 3, { snapshot: null });
    expect(toOperation(sale)).toEqual({
      deviceOperationId: 'a',
      deviceSequence: 3,
      type: 'sale.create',
      schemaVersion: 1,
      payloadHash: payloadHash(sale.input),
      payload: sale.input,
      lease: 'lease.token',
      actorId: 'u1',
      capturedAt: sale.createdAt,
      snapshot: undefined,
    });
  });
});

describe('syncPendingSales (batched push)', () => {
  it('uploads nothing once the till was marked lost', async () => {
    const { deviceLost } = await import('@/lib/api/client');
    seed(pending('a', 1));
    deviceLost.mark();
    try {
      const result = await syncPendingSales();
      expect(push).not.toHaveBeenCalled();
      expect(result).toMatchObject({ uploaded: 0, remaining: 1 });
      expect(db.sales.get('a')?.error).toBeUndefined();
    } finally {
      deviceLost.clear();
    }
  });

  it('pushes in device-sequence order, in batches, and clears acknowledged operations', async () => {
    seed(pending('c', 3), pending('a', 1), pending('b', 2));
    push.mockImplementation(acceptAll);

    const result = await syncPendingSales();

    expect(result).toEqual({ uploaded: 3, failed: 0, remaining: 0, deferred: 0 });
    expect(push.mock.calls.map(([body]) => body.operations.map((o) => o.deviceOperationId))).toEqual([['a', 'b'], ['c']]);
    expect(push.mock.calls[0][0].deviceId).toBe('d1');
    expect(db.acks.get('a')).toMatchObject({ saleId: 'srv-a', saleNumber: 'S-a' });
    expect(db.meta.get('lastSyncAt')).toEqual(expect.any(String));
  });

  it('keeps needs_review operations with the reason and never resends them automatically', async () => {
    seed(pending('a', 1), pending('b', 2));
    push.mockImplementationOnce(async ({ operations }) => ({
      serverTime: 'now',
      results: [
        { deviceOperationId: 'a', deviceSequence: 1, status: 'needs_review', reason: 'Register not found' },
        { deviceOperationId: 'b', deviceSequence: 2, status: 'accepted', saleId: 's-b', saleNumber: 'S-b' },
      ].filter((r) => operations.some((o) => o.deviceOperationId === r.deviceOperationId)) as SyncAck[],
    }));

    const result = await syncPendingSales();
    expect(result).toMatchObject({ uploaded: 1, failed: 1, remaining: 1 });
    expect(db.sales.get('a')).toMatchObject({ error: 'Register not found', attempts: 1 });

    push.mockClear();
    await syncPendingSales();
    expect(push).not.toHaveBeenCalled();
  });

  it('a pending_dependency answer holds back the later batches (device order)', async () => {
    seed(pending('a', 1), pending('b', 2), pending('c', 3));
    push.mockImplementationOnce(async () => ({
      serverTime: 'now',
      results: [
        { deviceOperationId: 'a', deviceSequence: 1, status: 'pending_dependency', reason: 'retry_later' },
        { deviceOperationId: 'b', deviceSequence: 2, status: 'pending_dependency', reason: 'waiting_for:a' },
      ],
    }));

    const result = await syncPendingSales();
    expect(push).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ uploaded: 0, deferred: 2, remaining: 3 });
    expect(db.sales.get('a')?.nextAttemptAt).toEqual(expect.any(String));
    expect(db.sales.get('a')?.error).toBeUndefined();
  });

  it('keeps everything queued when the server is unreachable and backs off', async () => {
    seed(pending('a', 1));
    push.mockRejectedValueOnce(networkError());

    const result = await syncPendingSales();
    expect(result).toMatchObject({ uploaded: 0, remaining: 1, deferred: 1 });
    expect(db.sales.get('a')).toEqual(pending('a', 1));
    const backoff = db.meta.get(PUSH_BACKOFF_KEY) as { attempt: number; nextAt: string };
    expect(backoff.attempt).toBe(0);
    expect(Date.parse(backoff.nextAt)).toBeGreaterThan(Date.now());
    expect(db.meta.has('lastSyncAt')).toBe(false);

    // During the backoff nothing is sent; a forced sync (manual) goes through
    push.mockClear();
    await syncPendingSales();
    expect(push).not.toHaveBeenCalled();
    push.mockImplementation(acceptAll);
    expect((await syncPendingSales({ force: true })).uploaded).toBe(1);
    expect(db.meta.get(PUSH_BACKOFF_KEY)).toBeNull();
  });

  it('server errors (5xx) back off too, growing the attempt', async () => {
    seed(pending('a', 1));
    db.meta.set(PUSH_BACKOFF_KEY, { attempt: 2, nextAt: new Date(0).toISOString() });
    push.mockRejectedValueOnce(httpError(503, 'Unavailable'));
    await syncPendingSales();
    expect((db.meta.get(PUSH_BACKOFF_KEY) as { attempt: number }).attempt).toBe(3);
    expect(db.sales.get('a')?.error).toBeUndefined();
  });

  it('a lost acknowledgement is safe: the resend is answered already_applied', async () => {
    seed(pending('a', 1));
    // First push reached the server but the answer was lost
    push.mockRejectedValueOnce(networkError());
    await syncPendingSales();
    expect(db.sales.has('a')).toBe(true);
    push.mockImplementationOnce(async () => ({
      serverTime: 'now',
      results: [{ deviceOperationId: 'a', deviceSequence: 1, status: 'already_applied', saleId: 's-a', saleNumber: 'S-1' }],
    }));
    const result = await syncPendingSales({ force: true });
    expect(result.uploaded).toBe(1);
    // Same operation id and payload hash both times
    expect(push.mock.calls[0][0].operations[0]).toEqual(push.mock.calls[1][0].operations[0]);
  });

  it('a batch refused as a whole (400) marks its operations for review', async () => {
    seed(pending('a', 1));
    push.mockRejectedValueOnce(httpError(400, ['operations.0.payloadHash must be 64 characters']));
    const result = await syncPendingSales();
    expect(result).toMatchObject({ failed: 1, remaining: 1 });
    expect(db.sales.get('a')?.error).toBe('operations.0.payloadHash must be 64 characters');
  });

  it('skips operations still waiting for their retry time', async () => {
    seed(pending('a', 1, { nextAttemptAt: new Date(Date.now() + 60_000).toISOString() }));
    await syncPendingSales();
    expect(push).not.toHaveBeenCalled();
  });

  it('shares one run between concurrent callers', async () => {
    seed(pending('a', 1));
    push.mockImplementation(acceptAll);
    const [first, second] = await Promise.all([syncPendingSales(), syncPendingSales()]);
    expect(first).toBe(second);
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe('retryPendingSale', () => {
  it('clears the needs_review flag and uploads the operation again', async () => {
    seed(pending('a', 1, { error: 'Register not found', attempts: 1 }));
    push.mockImplementation(acceptAll);
    const result = await retryPendingSale('a');
    expect(result).toMatchObject({ uploaded: 1, remaining: 0 });
  });
});

describe('export / import of unsynced sales', () => {
  it('exports every queued operation and imports it back through /sync/import in order', async () => {
    seed(pending('b', 2, { error: 'Register not found' }), pending('a', 1));
    const file = await buildExport();
    expect(file).toMatchObject({ format: 'modern-pos-unsynced-sales', count: 2, total: 20, device: { id: 'd1' } });

    const parsed = parseExport(JSON.stringify(file));
    vi.mocked(syncApi.import).mockImplementation(async ({ operations }) => acceptAll({ operations }));
    const acks = await importExport({ ...parsed, operations: [...parsed.operations].reverse() });
    expect(vi.mocked(syncApi.import).mock.calls[0][0]).toMatchObject({ deviceId: 'd1' });
    expect(acks.map((a) => a.deviceOperationId)).toEqual(['a', 'b']);
    expect(() => parseExport('{"format":"other"}')).toThrow(/not an export/);
  });
});

const item = (variantId: string, extra: Partial<CatalogItem> = {}): CatalogItem => ({
  variantId,
  productId: `p-${variantId}`,
  categoryId: null,
  productName: variantId,
  variantName: null,
  sku: variantId,
  barcode: null,
  price: 1,
  stock: 5,
  allowBackorder: false,
  imageUrl: null,
  ...extra,
});

const syncPage = (extra: Partial<Awaited<ReturnType<typeof syncApi.changes>>> = {}) => ({
  cursor: 'c2',
  hasMore: false,
  reset: false,
  resetReason: null,
  serverTime: 'now',
  items: [],
  removedVariantIds: [],
  customers: [],
  removedCustomerIds: [],
  context: null,
  ...extra,
});

describe('refreshCatalog', () => {
  it('first sync: takes a cursor, then downloads the full catalog', async () => {
    changes.mockResolvedValueOnce(syncPage({ reset: true, resetReason: 'first_sync', cursor: 'c1' }));
    fullCatalog.mockResolvedValueOnce([item('a'), item('b')]);

    const result = await refreshCatalog('r1');

    expect(result.mode).toBe('full');
    expect(changes).toHaveBeenCalledWith({ registerId: 'r1' });
    expect(db.catalogs.get('r1')).toMatchObject({ cursor: 'c1' });
    expect(db.catalogs.get('r1')?.items).toHaveLength(2);
  });

  it('later syncs apply only the changes since the cursor', async () => {
    db.meta.set('catalogFullAt:r1', new Date().toISOString());
    db.catalogs.set('r1', { items: [item('a'), item('b', { price: 2 })], savedAt: 'x', cursor: 'c1' });
    changes
      .mockResolvedValueOnce(syncPage({ items: [item('b', { price: 3 })], cursor: 'c2', hasMore: true }))
      .mockResolvedValueOnce(syncPage({ items: [item('c')], removedVariantIds: ['a'], cursor: 'c3' }));

    const result = await refreshCatalog('r1');

    expect(result.mode).toBe('incremental');
    expect(fullCatalog).not.toHaveBeenCalled();
    expect(changes.mock.calls.map(([params]) => params.cursor)).toEqual(['c1', 'c2']);
    expect(result.items.map((i) => [i.variantId, i.price])).toEqual([
      ['b', 3],
      ['c', 1],
    ]);
    expect(db.catalogs.get('r1')?.cursor).toBe('c3');
  });

  it('falls back to a full download when the server asks for a reset', async () => {
    db.meta.set('catalogFullAt:r1', new Date().toISOString());
    db.catalogs.set('r1', { items: [item('a')], savedAt: 'x', cursor: 'old' });
    changes
      .mockResolvedValueOnce(syncPage({ reset: true, resetReason: 'price_lists_changed' }))
      .mockResolvedValueOnce(syncPage({ reset: true, cursor: 'fresh' }));
    fullCatalog.mockResolvedValueOnce([item('z')]);

    const result = await refreshCatalog('r1');

    expect(result.mode).toBe('full');
    expect(db.catalogs.get('r1')).toMatchObject({ cursor: 'fresh' });
  });
});

describe('resnapshotCatalog', () => {
  it('drops cached catalogs and downloads again (queued sales untouched)', async () => {
    db.catalogs.set('r1', { items: [item('old')], savedAt: 'x', cursor: 'c-old' });
    seed(pending('a', 1));
    changes.mockResolvedValueOnce(syncPage({ reset: true, resetReason: 'first_sync', cursor: 'c-new' }));
    fullCatalog.mockResolvedValueOnce([item('new')]);

    const result = await resnapshotCatalog('r1');

    expect(result.mode).toBe('full');
    expect(db.catalogs.get('r1')).toMatchObject({ cursor: 'c-new' });
    expect(db.sales.has('a')).toBe(true);
  });
});

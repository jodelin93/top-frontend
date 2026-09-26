import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CatalogItem, CreateSaleInput } from '@/lib/api/sales';
import {
  acknowledgedSales,
  deviceStore,
  isLeaseActive,
  mergeCatalog,
  OfflineLeaseError,
  offlineCache,
  OP_SCHEMA_VERSION,
  pendingSales,
  resetOfflineDbForTests,
  type NewPendingSale,
  type SaleSnapshot,
} from './offline-db';
import { payloadHash } from './payload-hash';
import type { LeaseClaims } from './offline-guard';

const item = (variantId: string, productName = variantId, price = 1): CatalogItem => ({
  variantId,
  productId: 'p',
  categoryId: null,
  productName,
  variantName: null,
  sku: variantId,
  barcode: null,
  price,
  stock: null,
  allowBackorder: false,
  imageUrl: null,
});

describe('offline lease', () => {
  const now = Date.parse('2026-09-24T12:00:00Z');

  it('is active until leaseExpiresAt', () => {
    expect(isLeaseActive({ leaseExpiresAt: '2026-09-24T12:00:01Z', revokedAt: null, checkedAt: '' }, now)).toBe(true);
    expect(isLeaseActive({ leaseExpiresAt: '2026-09-24T12:00:00Z', revokedAt: null, checkedAt: '' }, now)).toBe(false);
  });

  it('is never active without a lease or for a revoked device', () => {
    expect(isLeaseActive(null, now)).toBe(false);
    expect(isLeaseActive({ leaseExpiresAt: null, revokedAt: null, checkedAt: '' }, now)).toBe(false);
    expect(
      isLeaseActive({ leaseExpiresAt: '2026-09-25T00:00:00Z', revokedAt: '2026-09-24T11:00:00Z', checkedAt: '' }, now)
    ).toBe(false);
  });
});

describe('mergeCatalog', () => {
  it('upserts changed items, drops removed ones and keeps name order', () => {
    const merged = mergeCatalog([item('a', 'Apple'), item('b', 'Bread')], [item('b', 'Bread', 5), item('c', 'Cake')], ['a']);
    expect(merged.map((i) => [i.variantId, i.price])).toEqual([
      ['b', 5],
      ['c', 1],
    ]);
  });
});

// ---- IndexedDB (fake-indexeddb) ----

const snapshot: SaleSnapshot = {
  currencyCode: 'USD',
  taxRate: 0.1,
  pricesIncludeTax: false,
  maxDiscountPercent: 20,
  exchangeRates: { HTG: 132.5 },
  settingsVersion: 7,
  discount: null,
  cartDiscount: null,
  lines: [{ variantId: 'v1', unitPrice: 10, catalogPrice: 10, discountPercent: 0, taxRate: 0.1 }],
};

const claims = (lim = { maxSaleAmount: 0, maxSales: 0, maxTotal: 0 }, jti = 'lease-1'): LeaseClaims => ({
  v: 1,
  jti,
  tid: 't1',
  bid: 'b1',
  rid: 'r1',
  did: 'd1',
  uid: 'u1',
  perms: ['pos.sell'],
  lim,
  iat: Date.now() - 3600_000,
  exp: Date.now() + 3600_000,
});

const sale = (id: string, total = 10, input: Partial<CreateSaleInput> = {}): NewPendingSale => ({
  id,
  input: { registerId: 'r1', items: [{ variantId: 'v1', quantity: 1 }], payments: [], idempotencyKey: id, ...input },
  createdAt: new Date().toISOString(),
  total,
  snapshot,
  actorId: 'u1',
});

async function enroll(lim?: LeaseClaims['lim'], jti?: string) {
  await deviceStore.save({ id: 'd1', tenantId: 't1', name: 'Till 1', registeredAt: '' });
  await deviceStore.saveLease('d1', {
    leaseExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    revokedAt: null,
    checkedAt: new Date().toISOString(),
    token: 'signed.token',
    claims: claims(lim, jti),
  });
}

beforeEach(async () => {
  await resetOfflineDbForTests();
  globalThis.indexedDB = new IDBFactory();
});

describe('pendingSales.add (local persistence contract)', () => {
  it('stores the sale with sequence, snapshot, hash, schema version, actor and lease in one transaction', async () => {
    await enroll();
    const first = await pendingSales.add(sale('a'));
    const second = await pendingSales.add(sale('b', 5));

    expect([first.deviceSequence, second.deviceSequence]).toEqual([1, 2]);
    const [stored] = await pendingSales.list();
    expect(stored).toMatchObject({
      id: 'a',
      deviceId: 'd1',
      deviceSequence: 1,
      schemaVersion: OP_SCHEMA_VERSION,
      actorId: 'u1',
      snapshot,
      lease: 'signed.token',
      leaseId: 'lease-1',
      input: { deviceId: 'd1', deviceSequence: 1, idempotencyKey: 'a' },
    });
    expect(stored.payloadHash).toBe(payloadHash(stored.input));
    expect(await deviceStore.lastSequence('d1')).toBe(2);
    expect(await deviceStore.getUsage('d1')).toEqual({ leaseId: 'lease-1', count: 2, total: 15 });
    expect((await deviceStore.getClock())?.counter).toBe(2);
    expect(stored.clockCounter).toBe(1);
  });

  it('refuses without a registration or a valid lease, writing nothing', async () => {
    await expect(pendingSales.add(sale('a'))).rejects.toBeInstanceOf(OfflineLeaseError);
    await deviceStore.save({ id: 'd1', tenantId: 't1', name: 'Till 1', registeredAt: '' });
    await deviceStore.saveLease('d1', { leaseExpiresAt: new Date(Date.now() - 1).toISOString(), revokedAt: null, checkedAt: '' });
    await expect(pendingSales.add(sale('a'))).rejects.toThrow(/expired/);
    expect(await pendingSales.list()).toEqual([]);
    expect(await deviceStore.lastSequence('d1')).toBe(0);
  });

  it('refuses sales beyond the lease limits (nothing written, sequence not used)', async () => {
    await enroll({ maxSaleAmount: 50, maxSales: 2, maxTotal: 0 });
    await expect(pendingSales.add(sale('big', 50.01))).rejects.toThrow(/offline limit of 50.00 per sale/);
    await pendingSales.add(sale('a'));
    await pendingSales.add(sale('b'));
    await expect(pendingSales.add(sale('c'))).rejects.toThrow(/limit of 2 offline sales/);
    expect((await pendingSales.list()).map((s) => s.id)).toEqual(['a', 'b']);
    expect(await deviceStore.lastSequence('d1')).toBe(2);
  });

  it('counts limits per lease: a renewed lease starts again', async () => {
    await enroll({ maxSaleAmount: 0, maxSales: 1, maxTotal: 0 }, 'lease-1');
    await pendingSales.add(sale('a'));
    await enroll({ maxSaleAmount: 0, maxSales: 1, maxTotal: 0 }, 'lease-2');
    await pendingSales.add(sale('b'));
    expect(await deviceStore.getUsage('d1')).toMatchObject({ leaseId: 'lease-2', count: 1 });
  });

  it('blocks after a clock rollback, and remembers the block', async () => {
    await enroll();
    await deviceStore.saveClock({
      lastServerTime: null,
      lastServerSeenAt: null,
      lastLocalTime: Date.now() + 24 * 3600_000,
      counter: 5,
      blocked: null,
    });
    await expect(pendingSales.add(sale('a'))).rejects.toThrow(/clock went backwards/);
    expect(await pendingSales.list()).toEqual([]);
    expect((await deviceStore.getClock())?.blocked).toBe('clock_rollback');
  });

  it('a failed write leaves no sale and no used sequence (the POS keeps the cart)', async () => {
    await enroll();
    const broken = sale('a', 10, { notes: (() => 'x') as unknown as string });
    await expect(pendingSales.add(broken)).rejects.toBeTruthy();
    expect(await pendingSales.list()).toEqual([]);
    expect(await deviceStore.lastSequence('d1')).toBe(0);
    expect(await deviceStore.getUsage('d1')).toBeUndefined();
  });
});

describe('pendingSales.applyAcks', () => {
  it('acknowledges, flags needs_review and defers pending_dependency in one go', async () => {
    await enroll();
    await pendingSales.add(sale('a'));
    await pendingSales.add(sale('b'));
    await pendingSales.add(sale('c'));
    const now = Date.parse('2026-09-24T12:00:00Z');

    const counts = await pendingSales.applyAcks(
      [
        { deviceOperationId: 'a', status: 'accepted', saleId: 's-a', saleNumber: 'S-1' },
        { deviceOperationId: 'b', status: 'needs_review', reason: 'Register not found' },
        { deviceOperationId: 'c', status: 'pending_dependency', reason: 'retry_later' },
        { deviceOperationId: 'gone', status: 'accepted', saleId: 'x' },
      ],
      now,
      () => 1
    );

    expect(counts).toEqual({ acknowledged: 1, needsReview: 1, deferred: 1 });
    expect(await acknowledgedSales.get('a')).toMatchObject({ saleId: 's-a', saleNumber: 'S-1', deviceSequence: 1 });
    const queue = await pendingSales.list();
    expect(queue.map((s) => s.id)).toEqual(['b', 'c']);
    expect(queue[0]).toMatchObject({ error: 'Register not found', attempts: 1, nextAttemptAt: null });
    expect(queue[1]).toMatchObject({ attempts: 1, nextAttemptAt: new Date(now + 5000).toISOString() });
    expect(queue[1].error).toBeUndefined();
  });

  it('already_applied (resent after a lost acknowledgement) also leaves the queue', async () => {
    await enroll();
    await pendingSales.add(sale('a'));
    await pendingSales.applyAcks([{ deviceOperationId: 'a', status: 'already_applied', saleId: 's-a', saleNumber: 'S-1' }]);
    expect(await pendingSales.list()).toEqual([]);
  });
});

describe('schema migration and resnapshot', () => {
  it('migrates v2 pending sales to v3 sync operations without losing them', async () => {
    const legacyInput = { registerId: 'r1', items: [], payments: [], idempotencyKey: 'old' };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('modern-pos', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('cache');
        db.createObjectStore('meta');
        db.createObjectStore('acknowledged', { keyPath: 'id' });
        db.createObjectStore('pendingSales', { keyPath: 'id' }).put({
          id: 'old',
          input: legacyInput,
          createdAt: '2026-09-20T10:00:00Z',
          total: 7,
          attempts: 1,
          error: 'Register not found',
          deviceId: 'd1',
          deviceSequence: 4,
        });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const [migrated] = await pendingSales.list();
    expect(migrated).toMatchObject({
      id: 'old',
      total: 7,
      error: 'Register not found',
      deviceSequence: 4,
      schemaVersion: OP_SCHEMA_VERSION,
      payloadHash: payloadHash(legacyInput),
      actorId: null,
      nextAttemptAt: null,
    });
  });

  it('a full resnapshot clears cached catalogs but never queued sales', async () => {
    await enroll();
    await pendingSales.add(sale('a'));
    await offlineCache.saveCatalog('r1', [item('v1')], 'cursor-1');
    await deviceStore.setMeta('catalogFullAt:r1', 'x');

    expect(await offlineCache.clearCatalogs()).toBe(1);
    expect(await offlineCache.loadCatalog('r1')).toBeNull();
    expect(await deviceStore.getMeta('catalogFullAt:r1')).toBeUndefined();
    expect((await pendingSales.list()).map((s) => s.id)).toEqual(['a']);
  });
});

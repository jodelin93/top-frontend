import { describe, expect, it } from 'vitest';
import { notificationLink } from './notification-labels';

const n = (type: string, entityType: string | null = null, entityId: string | null = null, locationId: string | null = null) => ({
  type,
  entityType,
  entityId,
  locationId,
});

describe('notificationLink', () => {
  it('opens the exact product (and its location) for one low-stock item', () => {
    expect(notificationLink(n('stock.low', 'product_variant', 'v-1', 'loc-1'))).toBe(
      '/admin/inventory?variant=v-1&location=loc-1'
    );
    expect(notificationLink(n('stock.low', 'product_variant', 'v-1'))).toBe('/admin/inventory?variant=v-1');
  });

  it('opens the location with "Low stock only" for a location summary', () => {
    expect(notificationLink(n('stock.low', 'inventory_location', 'loc-2'))).toBe(
      '/admin/inventory?location=loc-2&lowStock=1'
    );
  });

  it('opens the counts tab for stock counts waiting for approval', () => {
    expect(notificationLink(n('approval.stock_count'))).toBe('/admin/inventory?tab=counts');
  });

  it('opens the page of the other types, and nothing for unknown ones', () => {
    expect(notificationLink(n('approval.expense'))).toBe('/admin/expenses');
    expect(notificationLink(n('payment.unresolved'))).toBe('/admin/payments');
    expect(notificationLink(n('reconciliation.issues', 'system_check_run', 'r-1'))).toBe('/admin/system-events');
    expect(notificationLink('shift.variance')).toBe('/admin/shifts');
    expect(notificationLink(n('something.else'))).toBeNull();
  });
});

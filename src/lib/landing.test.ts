import { describe, expect, it } from 'vitest';
import { canUseAdmin, type User } from '@/stores/auth-store';
import { canSell, firstAdminHref, homePath } from './landing';

const user = (permissions: string[]): User => ({
  id: 'u1',
  email: 'u@test.com',
  firstName: null,
  lastName: null,
  role: 'custom',
  permissions,
  tenantId: 't1',
  mfaEnabled: false,
});

// Demo roles (top-backend role presets)
const accountant = user([
  'reports.view',
  'reports.export',
  'sales.view',
  'expenses.create',
  'expenses.approve',
  'payments.reconcile',
  'audit.view',
  'customers.view',
  'sales.reprint',
]);
const inventoryClerk = user([
  'inventory.view',
  'inventory.receive',
  'inventory.adjust',
  'inventory.count',
  'inventory.transfer',
  'purchasing.manage',
  'catalog.manage',
]);
const cashier = user(['pos.sell', 'pos.hold', 'shifts.operate', 'customers.view']);
const owner = user(['pos.sell', 'reports.view', 'settings.manage', 'expenses.approve']);

describe('homePath', () => {
  it('sends users who sell to the till', () => {
    expect(homePath(cashier)).toBe('/pos');
    expect(homePath(owner)).toBe('/pos');
  });

  it('sends an accountant to the admin dashboard', () => {
    expect(canSell(accountant)).toBe(false);
    expect(homePath(accountant)).toBe('/admin/dashboard');
  });

  it('starts an inventory clerk on the stock, not on the review queue', () => {
    // Everyday pages come before the rest of the menu
    expect(homePath(inventoryClerk)).toBe('/admin/inventory');
  });

  it('opens the admin area to a non-seller with only a page-level permission', () => {
    const reconciler = user(['payments.reconcile']);
    expect(canUseAdmin(reconciler)).toBe(true);
    expect(homePath(reconciler)).toBe('/admin/payments');
  });

  it('keeps cashiers out of the admin area', () => {
    expect(canUseAdmin(cashier)).toBe(false);
    expect(firstAdminHref(cashier)).toBeNull();
  });

  it('falls back to the till (no-access message) for users with neither', () => {
    const nobody = user(['customers.view']);
    expect(firstAdminHref(nobody)).toBeNull();
    expect(homePath(nobody)).toBe('/pos');
    expect(homePath(null)).toBe('/pos');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { useI18nStore } from '@/i18n';
import {
  permissionLabel,
  roleLabel,
  translateNotificationText,
  translateServerError,
  translateServerNote,
} from './server-texts';

const french = () => useI18nStore.setState({ personal: 'fr' });

describe('server texts', () => {
  afterEach(() => useI18nStore.setState({ personal: null, storeDefault: null, initial: 'en' }));

  it('leave English untouched', () => {
    expect(translateServerError('Not enough stock (20 on hand)')).toBe('Not enough stock (20 on hand)');
    expect(translateServerError('Some brand new message')).toBe('Some brand new message');
    expect(translateNotificationText('3 expense(s) waiting for approval')).toBe('3 expenses waiting for approval');
  });

  it('translate fixed and templated error messages, keeping the variable part', () => {
    french();
    expect(translateServerError("This sale's shift is closed: use a return instead of a void")).not.toMatch(/shift/);
    const stock = translateServerError('Not enough stock (20 on hand)');
    expect(stock).toContain('20');
    expect(stock).not.toContain('Not enough');
    const named = translateServerError('Apples: Quantity must be greater than zero');
    expect(named.startsWith('Apples: ')).toBe(true);
    expect(named).not.toContain('Quantity');
    expect(translateServerError('Some brand new message')).toBe('Some brand new message');
  });

  it('translate notifications line by line', () => {
    french();
    const body = translateNotificationText('SKU-1 Apples: 2 (min 5)\n… and 3 more');
    expect(body.split('\n')).toHaveLength(2);
    expect(body).toContain('SKU-1');
    expect(body).not.toContain('and 3 more');
    expect(translateNotificationText('1 expense(s) waiting for approval')).not.toContain('waiting');
  });

  it('translate notes, permissions and built-in roles, not store data', () => {
    french();
    expect(translateServerNote('Sale MAIN-000123')).toContain('MAIN-000123');
    expect(translateServerNote('Sale MAIN-000123')).not.toContain('Sale ');
    expect(permissionLabel('purchasing.approve', 'Approve purchase orders')).toBe('Approuver les bons de commande');
    expect(permissionLabel('future.permission', 'Something new')).toBe('Something new');
    expect(roleLabel('Owner')).toBe('Propriétaire');
    expect(roleLabel('Accountant')).toBe('Accountant');
  });
});

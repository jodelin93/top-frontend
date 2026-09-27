import { afterEach, describe, expect, it } from 'vitest';
import { useI18nStore } from '@/i18n';
import {
  permissionLabel,
  roleLabel,
  statusText as translateStatus,
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

  it('translate product import row problems, keeping columns and values', () => {
    french();
    expect(translateServerError('Duplicate SKU (also on line 4)')).toBe('SKU en double (aussi à la ligne 4)');
    expect(translateServerError('price must be a positive number (got "abc")')).toBe('price doit être un nombre positif (reçu « abc »)');
    expect(translateServerError('status must be one of active, inactive (got "old")')).toContain('active, inactive');
    expect(translateServerError('Not imported: Unknown category code "FOOD"')).toBe('Non importé : Code de catégorie inconnu « FOOD »');
    useI18nStore.setState({ personal: 'ht' });
    expect(translateServerError('Unknown tax category code "VAT"')).toBe('Kòd kategori taks "VAT" enkoni');
    useI18nStore.setState({ personal: 'es' });
    expect(translateServerError('cost can only be imported for simple products; set it on the variants')).toBe(
      'cost solo se puede importar para productos simples; defínalo en las variantes'
    );
  });

  it('translate status checks with their state and action', () => {
    french();
    expect(translateServerError('A partially dispatched transfer cannot be edited')).toBe(
      'Impossible de modifier un transfert au statut « partiellement expédié »'
    );
    expect(translateServerError('Cannot pay an expense that is draft')).toBe('Impossible de payer une dépense au statut « brouillon »');
    useI18nStore.setState({ personal: 'ht' });
    expect(translateServerError('A pending approval purchase order cannot be received')).toBe(
      `Ou pa ka resevwa yon bon kòmand ki gen estati « ${translateStatus('pending approval')} »`
    );
    useI18nStore.setState({ personal: 'es' });
    expect(translateServerError('Only 3 unit(s) can be written off on a line (5 given)')).toBe(
      'Solo se pueden dar de baja 3 unidad(es) en una línea (se indicaron 5)'
    );
    expect(translateServerError('You cannot create this role: it includes permissions you do not have yourself (sales.void)')).not.toMatch(
      /permissions you|sales\.void/
    );
  });

  it('translate class-validator messages, keeping the field name', () => {
    french();
    expect(translateServerError('email must be an email')).toBe('email doit être une adresse e-mail');
    expect(translateServerError('each value in tags must be a string')).toBe('chaque valeur de tags doit être du texte');
    expect(translateServerError('items.0.quantity must not be less than 0')).toBe('items.0.quantity ne doit pas être inférieur à 0');
    useI18nStore.setState({ personal: 'ht' });
    expect(translateServerError('name should not be empty')).toBe('name pa dwe vid');
    useI18nStore.setState({ personal: 'es' });
    expect(translateServerError('price must be a number conforming to the specified constraints')).toBe('price debe ser un número');
    expect(translateServerError('property foo should not exist')).toBe('el campo foo no está permitido');
    expect(translateServerError('code must be shorter than or equal to 50 characters')).toBe('code debe tener como máximo 50 caracteres');
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

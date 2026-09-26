import { describe, expect, it } from 'vitest';
import { fromCustomFieldDraft, toCustomFieldDraft } from './customer-custom-fields';
import type { CustomerFieldDefinition } from '@/lib/api/customers';

const field = (key: string, fieldType: CustomerFieldDefinition['fieldType'], extra: Partial<CustomerFieldDefinition> = {}) =>
  ({ id: key, key, label: key, fieldType, isRequired: false, options: null, sortOrder: 0, isActive: true, ...extra }) as CustomerFieldDefinition;

const definitions = [
  field('card', 'text', { isRequired: true }),
  field('visits', 'number'),
  field('vip', 'boolean'),
  field('hidden', 'text', { isActive: false }),
];

describe('custom customer fields', () => {
  it('turns saved values into form strings', () => {
    expect(toCustomFieldDraft(definitions, { card: 'A1', visits: 3, vip: false })).toEqual({
      card: 'A1',
      visits: '3',
      vip: 'false',
      hidden: '',
    });
  });

  it('converts form strings to typed values and clears empty ones', () => {
    expect(fromCustomFieldDraft(definitions, { card: ' A1 ', visits: '12', vip: 'true', hidden: 'x' })).toEqual({
      values: { card: 'A1', visits: 12, vip: true },
      errors: [],
    });
    expect(fromCustomFieldDraft(definitions, { card: 'A1', visits: '', vip: '' }).values).toEqual({
      card: 'A1',
      visits: null,
      vip: null,
    });
  });

  it('reports missing required and invalid numbers', () => {
    expect(fromCustomFieldDraft(definitions, { visits: 'lots' }).errors).toEqual([
      'card is required',
      'visits must be a number',
    ]);
  });
});

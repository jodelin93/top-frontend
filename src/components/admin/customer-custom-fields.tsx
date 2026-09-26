'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/admin/page-header';
import type { CustomerFieldDefinition, CustomFieldValue } from '@/lib/api/customers';
import { currentLocale, t } from '@/i18n';

// Form values are kept as strings; converted on save
export type CustomFieldDraft = Record<string, string>;

export const toCustomFieldDraft = (
  definitions: CustomerFieldDefinition[],
  values: Record<string, CustomFieldValue> | undefined
): CustomFieldDraft =>
  Object.fromEntries(
    definitions.map((d) => {
      const value = values?.[d.key];
      return [d.key, value === undefined || value === null ? '' : String(value)];
    })
  );

/** Draft → API values ('' clears a field); returns errors for required/invalid ones */
export function fromCustomFieldDraft(
  definitions: CustomerFieldDefinition[],
  draft: CustomFieldDraft
): { values: Record<string, CustomFieldValue | null>; errors: string[] } {
  const values: Record<string, CustomFieldValue | null> = {};
  const errors: string[] = [];
  for (const d of definitions.filter((def) => def.isActive)) {
    const raw = (draft[d.key] ?? '').trim();
    if (!raw) {
      if (d.isRequired) errors.push(t('{label} is required', { label: d.label }));
      values[d.key] = null;
      continue;
    }
    if (d.fieldType === 'number') {
      if (!/^-?\d+(\.\d+)?$/.test(raw)) errors.push(t('{label} must be a number', { label: d.label }));
      values[d.key] = Number(raw);
    } else if (d.fieldType === 'boolean') {
      values[d.key] = raw === 'true';
    } else {
      values[d.key] = raw;
    }
  }
  return { values, errors };
}

export function formatCustomFieldValue(definition: CustomerFieldDefinition, value: CustomFieldValue | undefined) {
  if (value === undefined || value === null || value === '') return '—';
  if (definition.fieldType === 'boolean') return value ? t('Yes') : t('No');
  if (definition.fieldType === 'date' && typeof value === 'string') {
    return new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
  }
  return String(value);
}

/** Inputs for the store's custom customer fields */
export function CustomerCustomFields({
  definitions,
  draft,
  onChange,
}: {
  definitions: CustomerFieldDefinition[];
  draft: CustomFieldDraft;
  onChange: (draft: CustomFieldDraft) => void;
}) {
  const active = definitions.filter((d) => d.isActive);
  if (!active.length) return null;
  const set = (key: string, value: string) => onChange({ ...draft, [key]: value });

  return (
    <>
      {active.map((d) => {
        const id = `custom-${d.key}`;
        const label = d.isRequired ? `${d.label} *` : d.label;
        const value = draft[d.key] ?? '';
        return (
          <Field key={d.id} label={label} htmlFor={id}>
            {d.fieldType === 'select' ? (
              <Select id={id} value={value} onChange={(e) => set(d.key, e.target.value)}>
                <option value="">—</option>
                {(d.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : d.fieldType === 'boolean' ? (
              <Select id={id} value={value} onChange={(e) => set(d.key, e.target.value)}>
                <option value="">—</option>
                <option value="true">{t('Yes')}</option>
                <option value="false">{t('No')}</option>
              </Select>
            ) : (
              <Input
                id={id}
                type={d.fieldType === 'date' ? 'date' : 'text'}
                inputMode={d.fieldType === 'number' ? 'decimal' : undefined}
                value={value}
                maxLength={500}
                onChange={(e) => set(d.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { parseOptions } from '@/components/admin/product-attributes-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { CustomerFieldDefinition, customerFieldsApi, CustomerFieldType } from '@/lib/api/customers';
import { t } from '@/i18n';

const typeLabels: Record<CustomerFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'List of options',
  boolean: 'Yes / no',
};

interface Draft {
  key: string;
  label: string;
  fieldType: CustomerFieldType;
  isRequired: boolean;
  options: string;
  sortOrder: string;
  isActive: boolean;
}

const toKey = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+|_+$/g, '')
    .slice(0, 50);

const toDraft = (field: CustomerFieldDefinition | null): Draft => ({
  key: field?.key ?? '',
  label: field?.label ?? '',
  fieldType: field?.fieldType ?? 'text',
  isRequired: field?.isRequired ?? false,
  options: (field?.options ?? []).join(', '),
  sortOrder: String(field?.sortOrder ?? 0),
  isActive: field?.isActive ?? true,
});

/** Store-defined customer fields shown on the customer form and detail view */
export function CustomerFieldsSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CustomerFieldDefinition | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: fields = [], isLoading, error: loadError } = useQuery({
    queryKey: ['customer-fields'],
    queryFn: () => customerFieldsApi.list(),
  });

  const remove = useMutation({
    mutationFn: (field: CustomerFieldDefinition) => customerFieldsApi.remove(field.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-fields'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete field')),
  });

  // Edit / delete buttons, shared by the table row and the phone card
  const rowActions = (field: CustomerFieldDefinition) => (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(field)} aria-label={t('Edit {name}', { name: field.key })}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600"
        onClick={() => {
          if (window.confirm(
              t('Delete field "{label}"? Values already saved on customers are kept but hidden.', {
                label: field.label,
              })
            )) {
            setError(null);
            remove.mutate(field);
          }
        }}
        aria-label={t('Delete {name}', { name: field.key })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          {t(
            'Extra details to keep about customers, e.g. a loyalty card number or preferred store. Required fields must be filled in when a customer is saved from the back office.'
          )}
        </p>
        <Button variant="outline" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('New field')}
        </Button>
      </div>
      <div className="empty:hidden p-4 pb-0">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load fields'))}</ErrorMessage>
      </div>
      {smallScreen ? (
        // Phones: one card per field instead of a table that scrolls sideways
        <DataCards
          items={fields}
          getKey={(field) => field.id}
          loading={isLoading}
          loadingText={t('Loading fields...')}
          emptyText={t('No custom fields yet.')}
        >
          {(field) => (
            <>
              <DataCardHeader
                title={field.label}
                subtitle={<span className="font-mono">{field.key}</span>}
                badge={<Badge variant={field.isActive ? 'success' : 'warning'}>{field.isActive ? t('Active') : t('Hidden')}</Badge>}
              />
              <DataCardFields>
                <DataCardField label={t('Type')}>
                  {t(typeLabels[field.fieldType])}
                  {field.options?.length ? <span className="text-gray-500"> ({field.options.join(', ')})</span> : null}
                </DataCardField>
                <DataCardField label={t('Required')}>{field.isRequired ? t('Yes') : t('No')}</DataCardField>
              </DataCardFields>
              <DataCardActions>{rowActions(field)}</DataCardActions>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Label')}</Th>
            <Th>{t('Key')}</Th>
            <Th>{t('Type')}</Th>
            <Th>{t('Required')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading fields...')}</EmptyRow>
          ) : fields.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No custom fields yet.')}</EmptyRow>
          ) : (
            fields.map((field) => (
              <tr key={field.id}>
                <Td className="font-medium">{field.label}</Td>
                <Td className="font-mono text-xs">{field.key}</Td>
                <Td>
                  {t(typeLabels[field.fieldType])}
                  {field.options?.length ? <span className="text-gray-500"> ({field.options.join(', ')})</span> : null}
                </Td>
                <Td>{field.isRequired ? t('Yes') : t('No')}</Td>
                <Td>
                  <Badge variant={field.isActive ? 'success' : 'warning'}>{field.isActive ? t('Active') : t('Hidden')}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {rowActions(field)}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      <FieldDialog
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        field={editing}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

function FieldDialog({ field, onClose }: { field: CustomerFieldDefinition | 'new' | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const existing = field && field !== 'new' ? field : null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        label: draft.label.trim(),
        fieldType: draft.fieldType,
        isRequired: draft.isRequired,
        options: draft.fieldType === 'select' ? parseOptions(draft.options) : null,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      };
      return existing
        ? customerFieldsApi.update(existing.id, input)
        : customerFieldsApi.create({ ...input, key: draft.key.trim() || toKey(draft.label) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-fields'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save field')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.label.trim()) return setError(t('Label is required'));
    if (draft.fieldType === 'select' && !parseOptions(draft.options).length) {
      return setError(t('List the options, separated by commas'));
    }
    setError(null);
    save.mutate();
  };

  return (
    <Dialog open={!!field} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? t('Edit customer field') : t('New customer field')}</DialogTitle>
          <DialogDescription>{t('Shown on the customer form and detail view.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Label')} htmlFor="field-label">
              <Input id="field-label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} autoFocus />
            </Field>
            <Field
              label={t('Key')}
              htmlFor="field-key"
              hint={existing ? t("Can't be changed") : t('Generated from the label when empty')}
            >
              <Input
                id="field-key"
                value={draft.key}
                disabled={!!existing}
                placeholder={toKey(draft.label)}
                onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
              />
            </Field>
            <Field label={t('Type')} htmlFor="field-type">
              <Select
                id="field-type"
                value={draft.fieldType}
                onChange={(e) => setDraft((d) => ({ ...d, fieldType: e.target.value as CustomerFieldType }))}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {t(label)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Order')} htmlFor="field-order">
              <Input
                id="field-order"
                inputMode="numeric"
                value={draft.sortOrder}
                onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value.replace(/\D/g, '') }))}
              />
            </Field>
            {draft.fieldType === 'select' && (
              <Field label={t('Options')} htmlFor="field-options" hint={t('Separated by commas')} className="sm:col-span-2">
                <Input id="field-options" value={draft.options} onChange={(e) => setDraft((d) => ({ ...d, options: e.target.value }))} />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={draft.isRequired}
                onChange={(e) => setDraft((d) => ({ ...d, isRequired: e.target.checked }))}
              />
              {t('Required')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
              {t('Shown on customers')}
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : existing ? t('Save changes') : t('Create field')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

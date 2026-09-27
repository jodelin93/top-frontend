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
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { taxRatesApi } from '@/lib/api/settings';
import { TaxCategory, taxCategoriesApi } from '@/lib/api/tax-categories';
import { t } from '@/i18n';

interface Draft {
  code: string;
  name: string;
  description: string;
  taxRateId: string;
}

const toDraft = (category: TaxCategory | null): Draft => ({
  code: category?.code ?? '',
  name: text(category?.name),
  description: category?.description ?? '',
  taxRateId: category?.taxRateId ?? '',
});

/**
 * Tax categories (Price lists & tax page): products in a category are taxed at its
 * rate, or not at all when it has none. Products without a category use the
 * store's default tax rate.
 */
export function TaxCategoriesSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaxCategory | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: categories = [], isLoading, error: loadError } = useQuery({
    queryKey: ['tax-categories'],
    queryFn: () => taxCategoriesApi.list(),
  });

  const remove = useMutation({
    mutationFn: (category: TaxCategory) => taxCategoriesApi.remove(category.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-categories'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete tax category')),
  });

  const handleDelete = (category: TaxCategory) => {
    if (
      !window.confirm(
        t("Delete tax category \"{name}\"? Its products will use the store's default tax rate.", {
          name: text(category.name, category.code),
        })
      )
    )
      return;
    setError(null);
    remove.mutate(category);
  };

  // Shared by the table row and the phone card
  const rateLabel = (category: TaxCategory) =>
    category.taxRate ? (
      `${text(category.taxRate.name, category.taxRate.code)} (${Number(category.taxRate.rate)}${
        category.taxRate.taxType === 'percentage' ? '%' : ''
      })`
    ) : (
      <Badge variant="info">{t('Tax exempt')}</Badge>
    );

  const rowActions = (category: TaxCategory) => (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setEditing(category)}
        aria-label={t('Edit {code}', { code: category.code })}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:text-red-700"
        onClick={() => handleDelete(category)}
        aria-label={t('Delete {code}', { code: category.code })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('Tax categories')}</h2>
          <p className="text-sm text-gray-500">
            {t(
              "Tax products differently (e.g. food, alcohol, exempt). Products without a tax category use the store's default tax rate."
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('New tax category')}
        </Button>
      </div>
      <div className="empty:hidden p-4 pb-0">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load tax categories'))}</ErrorMessage>
      </div>
      {smallScreen ? (
        // Phones: one card per category instead of a table that scrolls sideways
        <DataCards
          items={categories}
          getKey={(category) => category.id}
          loading={isLoading}
          loadingText={t('Loading tax categories...')}
          emptyText={t('No tax categories yet. Every product uses the default tax rate.')}
        >
          {(category) => (
            <>
              <DataCardHeader title={text(category.name, '—')} subtitle={<span className="font-mono">{category.code}</span>} />
              <DataCardFields>
                <DataCardField label={t('Tax rate')} full>
                  {rateLabel(category)}
                </DataCardField>
                {category.description && (
                  <DataCardField label={t('Description')} full>
                    <span className="text-gray-600">{category.description}</span>
                  </DataCardField>
                )}
              </DataCardFields>
              <DataCardActions>{rowActions(category)}</DataCardActions>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Tax rate')}</Th>
            <Th>{t('Description')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={5}>{t('Loading tax categories...')}</EmptyRow>
          ) : categories.length === 0 ? (
            <EmptyRow colSpan={5}>{t('No tax categories yet. Every product uses the default tax rate.')}</EmptyRow>
          ) : (
            categories.map((category) => (
              <tr key={category.id}>
                <Td className="font-mono text-xs">{category.code}</Td>
                <Td className="font-medium">{text(category.name, '—')}</Td>
                <Td>
                  {rateLabel(category)}
                </Td>
                <Td className="text-gray-600">{category.description ?? '—'}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {rowActions(category)}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      <TaxCategoryDialog
        // Keyed so the form starts fresh for each category
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        category={editing}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

function TaxCategoryDialog({
  category,
  onClose,
}: {
  category: TaxCategory | 'new' | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = category && category !== 'new' ? category : null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing));
  const [error, setError] = useState<string | null>(null);

  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: () => taxRatesApi.list(),
    enabled: !!category,
  });

  const save = useMutation({
    mutationFn: () => {
      const input = {
        code: draft.code.trim(),
        name: { ...existing?.name, en: draft.name.trim() },
        description: draft.description.trim() || (existing ? null : undefined),
        taxRateId: draft.taxRateId || null,
      };
      return existing ? taxCategoriesApi.update(existing.id, input) : taxCategoriesApi.create(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tax-categories'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save tax category')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim() || !draft.name.trim()) {
      setError(t('Code and name are required'));
      return;
    }
    setError(null);
    save.mutate();
  };

  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? t('Edit tax category') : t('New tax category')}</DialogTitle>
          <DialogDescription>{t('Products assigned to this category are taxed at its rate.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Code')} htmlFor="tax-category-code" hint={t('Used in product imports, e.g. FOOD')}>
              <Input id="tax-category-code" value={draft.code} onChange={set('code')} autoFocus />
            </Field>
            <Field label={t('Name')} htmlFor="tax-category-name">
              <Input id="tax-category-name" value={draft.name} onChange={set('name')} />
            </Field>
            <Field label={t('Tax rate')} htmlFor="tax-category-rate" className="sm:col-span-2">
              <Select id="tax-category-rate" value={draft.taxRateId} onChange={set('taxRateId')}>
                <option value="">{t('None (tax exempt)')}</option>
                {taxRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {text(rate.name, rate.code)} ({Number(rate.rate)}
                    {rate.taxType === 'percentage' ? '%' : ''})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Description')} htmlFor="tax-category-description" className="sm:col-span-2">
              <Input id="tax-category-description" value={draft.description} onChange={set('description')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : existing ? t('Save changes') : t('Create tax category')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

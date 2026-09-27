'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { RowActions, SettingsSection } from '@/components/admin/settings-shared';
import { getErrorMessage } from '@/lib/api/client';
import { ExpenseCategory, expenseCategoriesApi } from '@/lib/api/expenses';
import { t } from '@/i18n';

/**
 * Expense categories (managed by people who approve expenses)
 */
export function ExpenseCategoriesSection({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null);
  const smallScreen = useSmallScreen();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });
  const remove = useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] }),
  });

  return (
    <SettingsSection
      title={t('Expense categories')}
      description={t('Group expenses for reporting, e.g. supplies, repairs, utilities.')}
      action={
        canManage && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" />
            {t('Add category')}
          </Button>
        )
      }
    >
      {(error || remove.error) && (
        <div className="p-4">
          <ErrorMessage>{getErrorMessage(error ?? remove.error, 'Something went wrong')}</ErrorMessage>
        </div>
      )}
      {smallScreen ? (
        <DataCards
          items={data}
          getKey={(c) => c.id}
          loading={isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No categories yet.')}
        >
          {(c) => (
            <>
              <DataCardHeader
                title={c.name}
                subtitle={<span className="font-mono">{c.code}</span>}
                badge={<Badge variant={c.isActive ? 'success' : 'warning'}>{c.isActive ? t('active') : t('inactive')}</Badge>}
              />
              {c.description && (
                <DataCardFields>
                  <DataCardField label={t('Description')} full>
                    <span className="text-gray-600">{c.description}</span>
                  </DataCardField>
                </DataCardFields>
              )}
              {canManage && (
                <DataCardActions>
                  <RowActions
                    label={c.name}
                    onEdit={() => setEditing(c)}
                    onDelete={() => {
                      if (window.confirm(t('Delete {name}?', { name: c.name }))) remove.mutate(c.id);
                    }}
                  />
                </DataCardActions>
              )}
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Description')}</Th>
            <Th>{t('Status')}</Th>
            {canManage && <Th />}
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={5}>{t('Loading...')}</EmptyRow>
          ) : data.length === 0 ? (
            <EmptyRow colSpan={5}>{t('No categories yet.')}</EmptyRow>
          ) : (
            data.map((c) => (
              <tr key={c.id}>
                <Td className="font-mono text-xs">{c.code}</Td>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-gray-600">{c.description ?? '—'}</Td>
                <Td>
                  <Badge variant={c.isActive ? 'success' : 'warning'}>{c.isActive ? t('active') : t('inactive')}</Badge>
                </Td>
                {canManage && (
                  <Td>
                    <RowActions
                      label={c.name}
                      onEdit={() => setEditing(c)}
                      onDelete={() => {
                        if (window.confirm(t('Delete {name}?', { name: c.name }))) remove.mutate(c.id);
                      }}
                    />
                  </Td>
                )}
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          {editing && (
            <CategoryForm
              key={editing === 'new' ? 'new' : editing.id}
              category={editing === 'new' ? null : editing}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

function CategoryForm({ category, onClose }: { category: ExpenseCategory | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(category?.code ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const save = useMutation({
    mutationFn: () => {
      const input = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        isActive,
      };
      return category ? expenseCategoriesApi.update(category.id, input) : expenseCategoriesApi.create(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      onClose();
    },
  });
  const valid = /^[A-Za-z0-9_-]{1,50}$/.test(code.trim()) && name.trim().length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{category ? t('Edit category') : t('New category')}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <ErrorMessage>{save.error ? getErrorMessage(save.error, 'Could not save') : null}</ErrorMessage>
        <Field label={t('Code')} htmlFor="category-code" hint={t('Letters, numbers, - and _')}>
          <Input id="category-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={50} />
        </Field>
        <Field label={t('Name')} htmlFor="category-name">
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        </Field>
        <Field label={t('Description')} htmlFor="category-description">
          <Input
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t('Active')}
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={!valid || save.isPending}>
            {t('Save')}
          </Button>
        </div>
      </form>
    </>
  );
}

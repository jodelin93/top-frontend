'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { CategoryFormDialog, flattenCategoryTree } from '@/components/admin/category-form-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { categoriesApi, Category } from '@/lib/api/categories';
import { text } from '@/lib/api/crud';
import { t } from '@/i18n';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const rows = useMemo(() => flattenCategoryTree(categories), [categories]);

  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(t('Delete "{name}"?', { name: text(category.name, category.code) }))) return;
    setActionError(null);
    try {
      await remove.mutateAsync(category.id);
    } catch (err) {
      // 409 when products or sub-categories still use it
      setActionError(getErrorMessage(err, 'Could not delete category'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Categories')}
        description={t('Organise products into a category tree.')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('New category')}
          </Button>
        }
      />

      <Card className="bg-white">
        {(error || actionError) && (
          <div className="m-4">
            <ErrorMessage>
              {actionError ?? getErrorMessage(error, 'Could not load categories')}
            </ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per category instead of a table that scrolls sideways
          <DataCards
            items={rows}
            getKey={({ category }) => category.id}
            loading={isLoading}
            loadingText={t('Loading categories...')}
            emptyText={t('No categories yet. Create your first one.')}
          >
            {({ category, depth }) => (
              <>
                <DataCardHeader
                  title={
                    <span style={{ paddingLeft: depth * 12 }} className="inline-flex items-center gap-1">
                      {depth > 0 && <span className="text-gray-300">└</span>}
                      {text(category.name, '—')}
                    </span>
                  }
                  badge={
                    <Badge variant={category.isActive ? 'success' : 'warning'}>
                      {category.isActive ? t('Active') : t('Inactive')}
                    </Badge>
                  }
                />
                <DataCardFields>
                  <DataCardField label={t('Code')}>
                    <span className="font-mono text-xs">{category.code}</span>
                  </DataCardField>
                  <DataCardField label={t('Sort order')}>{category.sortOrder}</DataCardField>
                </DataCardFields>
                <DataCardActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(category)}
                    aria-label={t('Edit {code}', { code: category.code })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(category)}
                    disabled={remove.isPending}
                    aria-label={t('Delete {code}', { code: category.code })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DataCardActions>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Name')}</Th>
              <Th>{t('Code')}</Th>
              <Th>{t('Sort order')}</Th>
              <Th>{t('Status')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={5}>{t('Loading categories...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={5}>{t('No categories yet. Create your first one.')}</EmptyRow>
            ) : (
              rows.map(({ category, depth }) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <Td className="font-medium">
                    <span style={{ paddingLeft: depth * 20 }} className="inline-flex items-center gap-1">
                      {depth > 0 && <span className="text-gray-300">└</span>}
                      {text(category.name, '—')}
                    </span>
                  </Td>
                  <Td className="font-mono text-xs">{category.code}</Td>
                  <Td>{category.sortOrder}</Td>
                  <Td>
                    <Badge variant={category.isActive ? 'success' : 'warning'}>
                      {category.isActive ? t('Active') : t('Inactive')}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(category)}
                        aria-label={t('Edit {code}', { code: category.code })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(category)}
                        disabled={remove.isPending}
                        aria-label={t('Delete {code}', { code: category.code })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        )}
      </Card>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        categories={categories}
      />
    </div>
  );
}

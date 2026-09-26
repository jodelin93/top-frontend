'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage, isVersionConflict } from '@/lib/api/client';
import { categoriesApi, Category } from '@/lib/api/categories';
import { LocalizedText, text } from '@/lib/api/crud';
import { t } from '@/i18n';

/**
 * Order categories depth-first so children follow their parent.
 * Categories whose parent is missing are shown at the top level.
 */
export function flattenCategoryTree(categories: Category[]): { category: Category; depth: number }[] {
  const ids = new Set(categories.map((c) => c.id));
  const children = new Map<string | null, Category[]>();
  for (const category of categories) {
    const parentId = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    children.set(parentId, [...(children.get(parentId) ?? []), category]);
  }

  const result: { category: Category; depth: number }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of children.get(parentId) ?? []) {
      result.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

// Ids of a category and everything below it (not valid as its parent)
function descendantIds(categories: Category[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        added = true;
      }
    }
  }
  return ids;
}

const categorySchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  parentId: z.string(),
  sortOrder: z.string().regex(/^\d*$/, 'Must be a whole number'),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryInput {
  code: string;
  name: LocalizedText;
  description?: LocalizedText | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function toFormData(category?: Category | null): CategoryFormData {
  return {
    code: category?.code ?? '',
    name: text(category?.name),
    description: category?.description?.en ?? '',
    parentId: category?.parentId ?? '',
    sortOrder: category?.sortOrder?.toString() ?? '',
    isActive: category?.isActive ?? true,
  };
}

// Empty fields are omitted on create and cleared (null) on update
function toInput(data: CategoryFormData, category?: Category | null): CategoryInput {
  const empty = category ? null : undefined;
  return {
    code: data.code.trim(),
    // Keep other locales intact when editing the English name/description
    name: { ...category?.name, en: data.name.trim() },
    description: data.description.trim()
      ? { ...category?.description, en: data.description.trim() }
      : empty,
    parentId: data.parentId || empty,
    sortOrder: data.sortOrder === '' ? (category ? 0 : undefined) : Number(data.sortOrder),
    ...(category && { isActive: data.isActive }),
  };
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Category to edit; null to create a new one
  category: Category | null;
  categories: Category[];
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
}: CategoryFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: toFormData(category),
  });

  useEffect(() => {
    if (open) {
      reset(toFormData(category));
    }
  }, [open, category, reset]);

  // A category can't be moved inside itself or one of its children
  const parentOptions = useMemo(() => {
    const excluded = category ? descendantIds(categories, category.id) : new Set<string>();
    return flattenCategoryTree(categories).filter(({ category: c }) => !excluded.has(c.id));
  }, [categories, category]);

  const save = useMutation({
    mutationFn: (input: CategoryInput) =>
      category
        ? categoriesApi.update(category.id, input, { expectedVersion: category.version })
        : categoriesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: CategoryFormData) => {
    setError(null);
    try {
      await save.mutateAsync(toInput(data, category));
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save category'));
      // Someone else saved it: load their version for the next attempt
      if (isVersionConflict(err)) void queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit category') : t('New category')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('Update {name}.', { name: text(category.name, category.code) })
              : t('Group products into a category.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="name" error={errors.name?.message && t(errors.name.message)}>
              <Input id="name" {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="code" error={errors.code?.message && t(errors.code.message)}>
              <Input id="code" {...register('code')} />
            </Field>

            <Field label={t('Description')} htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" rows={3} {...register('description')} />
            </Field>

            <Field label={t('Parent category')} htmlFor="parentId">
              <Select id="parentId" {...register('parentId')}>
                <option value="">{t('None (top level)')}</option>
                {parentOptions.map(({ category: c, depth }) => (
                  <option key={c.id} value={c.id}>
                    {'  '.repeat(depth)}
                    {text(c.name, c.code)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Sort order')} htmlFor="sortOrder" error={errors.sortOrder?.message && t(errors.sortOrder.message)}>
              <Input id="sortOrder" inputMode="numeric" placeholder="0" {...register('sortOrder')} />
            </Field>

            {isEdit && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
                {t('Active (shown in the POS and product forms)')}
              </label>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : isEdit ? t('Save changes') : t('Create category')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

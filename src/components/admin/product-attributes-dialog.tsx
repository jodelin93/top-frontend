'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { AttributeDefinition, attributesApi, AttributeType } from '@/lib/api/products';
import { t } from '@/i18n';

interface Draft {
  code: string;
  name: string;
  attributeType: AttributeType;
  options: string;
}

const emptyDraft: Draft = { code: '', name: '', attributeType: 'select', options: '' };

// "S, M, L" → ["S", "M", "L"]
export const parseOptions = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

/**
 * Product attributes (Size, Colour, ...) whose values variants are generated from
 */
export function ProductAttributesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  // null = list only, 'new' = adding, otherwise the attribute being edited
  const [editing, setEditing] = useState<AttributeDefinition | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.list(),
    enabled: open,
  });

  const done = async () => {
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: ['attributes'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const input = {
        name: { ...(editing !== 'new' ? editing?.name : {}), en: draft.name.trim() },
        attributeType: draft.attributeType,
        options: draft.attributeType === 'select' || draft.attributeType === 'color' ? parseOptions(draft.options) : null,
      };
      return editing && editing !== 'new'
        ? attributesApi.update(editing.id, input)
        : attributesApi.create({ ...input, code: draft.code.trim() || slug(draft.name), isVariantDefining: true });
    },
    onSuccess: done,
    onError: (err) => setError(getErrorMessage(err, 'Could not save attribute')),
  });

  const remove = useMutation({
    mutationFn: (attribute: AttributeDefinition) => attributesApi.remove(attribute.id),
    onSuccess: done,
    onError: (err) => setError(getErrorMessage(err, 'Could not delete attribute')),
  });

  const startEdit = (attribute: AttributeDefinition | null) => {
    setError(null);
    setEditing(attribute ?? 'new');
    setDraft(
      attribute
        ? {
            code: attribute.code,
            name: text(attribute.name),
            attributeType: attribute.attributeType,
            options: (attribute.options ?? []).join(', '),
          }
        : emptyDraft
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError(t('Name is required'));
      return;
    }
    if ((draft.attributeType === 'select' || draft.attributeType === 'color') && !parseOptions(draft.options).length) {
      setError(t('List the options, separated by commas'));
      return;
    }
    setError(null);
    save.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setEditing(null);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Product attributes')}</DialogTitle>
          <DialogDescription>
            {t(
              'Define attributes like Size or Colour with their options, then generate variants from them on a variable product.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        {editing ? (
          <form onSubmit={submit} className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('Name')} htmlFor="attribute-name">
                <Input
                  id="attribute-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={t('e.g. Size')}
                  autoFocus
                />
              </Field>
              <Field label={t('Code')} htmlFor="attribute-code" hint={editing === 'new' ? t('Generated from the name when empty') : undefined}>
                <Input
                  id="attribute-code"
                  value={draft.code}
                  disabled={editing !== 'new'}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                />
              </Field>
              <Field label={t('Type')} htmlFor="attribute-type">
                <Select
                  id="attribute-type"
                  value={draft.attributeType}
                  onChange={(e) => setDraft((d) => ({ ...d, attributeType: e.target.value as AttributeType }))}
                >
                  <option value="select">{t('List of options')}</option>
                  <option value="color">{t('Colour')}</option>
                  <option value="text">{t('Free text')}</option>
                  <option value="number">{t('Number')}</option>
                </Select>
              </Field>
              {(draft.attributeType === 'select' || draft.attributeType === 'color') && (
                <Field label={t('Options')} htmlFor="attribute-options" hint={t('Separated by commas, e.g. S, M, L, XL')}>
                  <Input
                    id="attribute-options"
                    value={draft.options}
                    onChange={(e) => setDraft((d) => ({ ...d, options: e.target.value }))}
                  />
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? t('Saving...') : t('Save attribute')}
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button variant="outline" onClick={() => startEdit(null)}>
              <Plus className="h-4 w-4" />
              {t('New attribute')}
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <THead>
              <tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Code')}</Th>
                <Th>{t('Options')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={4}>{t('Loading attributes...')}</EmptyRow>
              ) : attributes.length === 0 ? (
                <EmptyRow colSpan={4}>{t('No attributes yet.')}</EmptyRow>
              ) : (
                attributes.map((attribute) => (
                  <tr key={attribute.id}>
                    <Td className="font-medium">{text(attribute.name, attribute.code)}</Td>
                    <Td className="font-mono text-xs">{attribute.code}</Td>
                    <Td className="text-gray-600">
                      {attribute.options?.length ? attribute.options.join(', ') : <span className="italic">{t('any value')}</span>}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(attribute)}
                          aria-label={t('Edit {code}', { code: attribute.code })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => {
                            if (window.confirm(t('Delete attribute "{name}"?', { name: text(attribute.name, attribute.code) }))) {
                              setError(null);
                              remove.mutate(attribute);
                            }
                          }}
                          aria-label={t('Delete {code}', { code: attribute.code })}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

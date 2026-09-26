'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
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
import { text } from '@/lib/api/crud';
import { CustomerGroup, customerGroupsApi } from '@/lib/api/customers';
import { priceListsApi } from '@/lib/api/price-lists';
import { t } from '@/i18n';

interface Draft {
  code: string;
  name: string;
  description: string;
  priceListId: string;
  discountPercent: string;
  defaultPaymentTermDays: string;
  isActive: boolean;
}

const toDraft = (group: CustomerGroup | null): Draft => ({
  code: group?.code ?? '',
  name: group?.name ?? '',
  description: group?.description ?? '',
  priceListId: group?.priceListId ?? '',
  discountPercent: group ? String(Number(group.discountPercent)) : '',
  defaultPaymentTermDays: group?.defaultPaymentTermDays != null ? String(group.defaultPaymentTermDays) : '',
  isActive: group?.isActive ?? true,
});

/** Customer groups: name, default price list and discount */
export function CustomerGroupsSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CustomerGroup | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [], isLoading, error: loadError } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => customerGroupsApi.list(),
  });
  const { data: priceLists = [] } = useQuery({ queryKey: ['price-lists'], queryFn: () => priceListsApi.list() });
  const priceListNames = new Map(priceLists.map((p) => [p.id, text(p.name, p.code)]));

  const remove = useMutation({
    mutationFn: (group: CustomerGroup) => customerGroupsApi.remove(group.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-groups'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete group')),
  });

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 text-sm text-gray-600">
          <Info className="h-4 w-4 shrink-0 text-blue-600" />
          <p>
            {t(
              "Group customers (e.g. staff, wholesale) and give each group a default price list and discount. These are stored with the group; the till doesn't apply them automatically yet."
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          {t('New group')}
        </Button>
      </div>
      <div className="empty:hidden p-4 pb-0">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load groups'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Price list')}</Th>
            <Th className="text-right">{t('Discount')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading groups...')}</EmptyRow>
          ) : groups.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No customer groups yet.')}</EmptyRow>
          ) : (
            groups.map((group) => (
              <tr key={group.id}>
                <Td className="font-mono text-xs">{group.code}</Td>
                <Td className="font-medium">{group.name}</Td>
                <Td>{group.priceListId ? (priceListNames.get(group.priceListId) ?? '—') : '—'}</Td>
                <Td className="text-right">{Number(group.discountPercent)}%</Td>
                <Td>
                  <Badge variant={group.isActive ? 'success' : 'warning'}>{group.isActive ? t('Active') : t('Inactive')}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(group)} aria-label={t('Edit {name}', { name: group.code })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => {
                        if (window.confirm(t('Delete group "{name}"? Its customers will have no group.', { name: group.name }))) {
                          setError(null);
                          remove.mutate(group);
                        }
                      }}
                      aria-label={t('Delete {name}', { name: group.code })}
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

      <GroupDialog
        key={editing === null ? 'closed' : editing === 'new' ? 'new' : editing.id}
        group={editing}
        priceLists={priceLists.map((p) => ({ id: p.id, label: text(p.name, p.code) }))}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

function GroupDialog({
  group,
  priceLists,
  onClose,
}: {
  group: CustomerGroup | 'new' | null;
  priceLists: { id: string; label: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = group && group !== 'new' ? group : null;
  const [draft, setDraft] = useState<Draft>(() => toDraft(existing));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || (existing ? null : undefined),
        priceListId: draft.priceListId || null,
        discountPercent: draft.discountPercent ? Number(draft.discountPercent) : 0,
        defaultPaymentTermDays: draft.defaultPaymentTermDays.trim()
          ? Math.max(0, Math.floor(Number(draft.defaultPaymentTermDays)) || 0)
          : null,
        ...(existing && { isActive: draft.isActive }),
      };
      return existing
        ? customerGroupsApi.update(existing.id, input, { expectedVersion: existing.version })
        : customerGroupsApi.create(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      onClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'Could not save group'));
      // Someone else saved it: load their version for the next attempt
      if (isVersionConflict(err)) void queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const discount = Number(draft.discountPercent || 0);
    if (!draft.code.trim() || !draft.name.trim()) return setError(t('Code and name are required'));
    if (Number.isNaN(discount) || discount < 0 || discount > 100) return setError(t('Discount must be between 0 and 100'));
    setError(null);
    save.mutate();
  };

  const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? t('Edit group') : t('New customer group')}</DialogTitle>
          <DialogDescription>{t('Assign customers to the group from their customer record.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Code')} htmlFor="group-code">
              <Input id="group-code" value={draft.code} onChange={set('code')} autoFocus />
            </Field>
            <Field label={t('Name')} htmlFor="group-name">
              <Input id="group-name" value={draft.name} onChange={set('name')} />
            </Field>
            <Field label={t('Default price list')} htmlFor="group-price-list">
              <Select id="group-price-list" value={draft.priceListId} onChange={set('priceListId')}>
                <option value="">{t('None')}</option>
                {priceLists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Discount %')} htmlFor="group-discount">
              <Input id="group-discount" inputMode="decimal" placeholder="0" value={draft.discountPercent} onChange={set('discountPercent')} />
            </Field>
            <Field label={t('Payment terms (days)')} htmlFor="group-terms" hint={t('For sales on account of the group')}>
              <Input
                id="group-terms"
                inputMode="numeric"
                placeholder="30"
                value={draft.defaultPaymentTermDays}
                onChange={set('defaultPaymentTermDays')}
              />
            </Field>
            <Field label={t('Description')} htmlFor="group-description" className="sm:col-span-2">
              <Input id="group-description" value={draft.description} onChange={set('description')} />
            </Field>
            {existing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                {t('Active')}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : existing ? t('Save changes') : t('Create group')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

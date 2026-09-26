'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Unit, UnitInput, unitsApi } from '@/lib/api/products';
import { t } from '@/i18n';

interface Draft {
  code: string;
  name: string;
  allowsDecimals: boolean;
  precision: number;
}

const emptyDraft: Draft = { code: '', name: '', allowsDecimals: false, precision: 3 };

/**
 * Units of measure (kg, litre, metre...). Only recorded on products for now:
 * selling measured quantities comes later.
 */
export function ProductUnitsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  // null = list only, 'new' = adding, otherwise the unit being edited
  const [editing, setEditing] = useState<Unit | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list(),
    enabled: open,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['units'] });

  const save = useMutation({
    mutationFn: () => {
      const input: UnitInput = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        allowsDecimals: draft.allowsDecimals,
        precision: draft.allowsDecimals ? draft.precision : 0,
      };
      return editing && editing !== 'new' ? unitsApi.update(editing.id, input) : unitsApi.create(input);
    },
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save unit')),
  });

  const toggleActive = useMutation({
    mutationFn: (unit: Unit) => unitsApi.update(unit.id, { isActive: !unit.isActive }),
    onSuccess: refresh,
    onError: (err) => setError(getErrorMessage(err, 'Could not update unit')),
  });

  // 409 when products use it: the server message says to deactivate it instead
  const remove = useMutation({
    mutationFn: (unit: Unit) => unitsApi.remove(unit.id),
    onSuccess: refresh,
    onError: (err) => setError(getErrorMessage(err, 'Could not delete unit')),
  });

  const startEdit = (unit: Unit | null) => {
    setError(null);
    setEditing(unit ?? 'new');
    setDraft(
      unit
        ? {
            code: unit.code,
            name: unit.name,
            allowsDecimals: unit.allowsDecimals,
            precision: unit.allowsDecimals ? unit.precision : 3,
          }
        : emptyDraft
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim()) {
      setError(t('Code is required'));
      return;
    }
    if (!draft.name.trim()) {
      setError(t('Name is required'));
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
          <DialogTitle>{t('Units of measure')}</DialogTitle>
          <DialogDescription>
            {t('Units like kg, litre or metre. They are recorded on products for now: selling measured quantities comes later.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        {editing ? (
          <form onSubmit={submit} className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('Name')} htmlFor="unit-name">
                <Input
                  id="unit-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={t('e.g. Kilogram')}
                  maxLength={50}
                  autoFocus
                />
              </Field>
              <Field label={t('Code')} htmlFor="unit-code">
                <Input
                  id="unit-code"
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder={t('e.g. kg')}
                  maxLength={20}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draft.allowsDecimals}
                  onChange={(e) => setDraft((d) => ({ ...d, allowsDecimals: e.target.checked }))}
                />
                {t('Allows decimal quantities (e.g. 1.25 kg)')}
              </label>
              {draft.allowsDecimals && (
                <Field label={t('Decimal places')} htmlFor="unit-precision">
                  <Select
                    id="unit-precision"
                    value={draft.precision}
                    onChange={(e) => setDraft((d) => ({ ...d, precision: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4].map((places) => (
                      <option key={places} value={places}>
                        {places}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? t('Saving...') : t('Save unit')}
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button variant="outline" onClick={() => startEdit(null)}>
              <Plus className="h-4 w-4" />
              {t('New unit')}
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <THead>
              <tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Code')}</Th>
                <Th>{t('Decimals')}</Th>
                <Th>{t('Status')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={5}>{t('Loading units...')}</EmptyRow>
              ) : units.length === 0 ? (
                <EmptyRow colSpan={5}>{t('No units yet. Products are counted by the piece.')}</EmptyRow>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <Td className="font-medium">{unit.name}</Td>
                    <Td className="font-mono text-xs">{unit.code}</Td>
                    <Td className="text-gray-600">
                      {unit.allowsDecimals ? t('{count} places', { count: unit.precision }) : t('Whole units')}
                    </Td>
                    <Td>
                      <Badge variant={unit.isActive ? 'success' : 'default'}>
                        {unit.isActive ? t('Active') : t('Inactive')}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(unit)}
                          aria-label={t('Edit {code}', { code: unit.code })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={toggleActive.isPending}
                          onClick={() => {
                            setError(null);
                            toggleActive.mutate(unit);
                          }}
                          aria-label={
                            unit.isActive
                              ? t('Deactivate {code}', { code: unit.code })
                              : t('Activate {code}', { code: unit.code })
                          }
                          title={unit.isActive ? t('Deactivate') : t('Activate')}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (window.confirm(t('Delete unit "{name}"?', { name: unit.name }))) {
                              setError(null);
                              remove.mutate(unit);
                            }
                          }}
                          aria-label={t('Delete {code}', { code: unit.code })}
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

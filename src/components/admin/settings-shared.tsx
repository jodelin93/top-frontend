'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { locationsApi, warehousesApi } from '@/lib/api/settings';
import { t } from '@/i18n';

// Section of a settings tab: a card with a title, optional action and a list
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

// Edit / delete icon buttons used by the settings lists
export function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={t('Edit {name}', { name: label })}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:text-red-700"
        onClick={onDelete}
        aria-label={t('Delete {name}', { name: label })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function CheckboxField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & ComponentProps<'input'>) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4" {...props} />
      <span>
        {label}
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

// Optional text input → trimmed value; empty is omitted on create, cleared (null) on update
export function optionalText(value: string, isEdit: boolean) {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return isEdit ? null : undefined;
}

export interface LocationOption {
  id: string;
  label: string;
  isSellable: boolean;
}

// Stock locations labelled "Warehouse › Location" for selects and tables
export function useLocationOptions() {
  const locations = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() });
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: () => warehousesApi.list() });

  const warehouseNames = new Map((warehouses.data ?? []).map((w) => [w.id, w.name]));
  const options: LocationOption[] = (locations.data ?? []).map((location) => ({
    id: location.id,
    label: `${warehouseNames.get(location.warehouseId) ?? t('Warehouse')} › ${location.name || location.code}`,
    isSellable: location.isSellable,
  }));
  const labels = new Map(options.map((o) => [o.id, o.label]));

  return {
    options,
    labelFor: (id: string | null | undefined, fallback = '—') => (id && labels.get(id)) || fallback,
    isLoading: locations.isLoading || warehouses.isLoading,
  };
}

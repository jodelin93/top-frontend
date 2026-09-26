'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge, statusVariant } from '@/components/ui/badge';
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
import { optionalText, RowActions, SettingsSection } from '@/components/admin/settings-shared';
import { SettingsBranchWarehouses } from '@/components/admin/settings-branch-warehouses';
import { getErrorMessage } from '@/lib/api/client';
import { Warehouse, warehousesApi } from '@/lib/api/settings';
import { LocationStockStatus, StockLocation, stockLocationsApi } from '@/lib/api/inventory';
import { t } from '@/i18n';

// The shared Warehouse type omits the optional address fields the API also returns
type WarehouseRow = Warehouse & {
  addressLine1?: string | null;
  city?: string | null;
  countryCode?: string | null;
};

// ---- Warehouses ----

const warehouseSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required').max(255),
  warehouseType: z.enum(['standard', 'transit', 'quarantine']),
  addressLine1: z.string().max(255),
  city: z.string().max(100),
  countryCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Use a 2-letter country code'),
  status: z.enum(['active', 'inactive']),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

function warehouseToFormData(warehouse: WarehouseRow | null): WarehouseFormData {
  return {
    code: warehouse?.code ?? '',
    name: warehouse?.name ?? '',
    warehouseType: warehouse?.warehouseType ?? 'standard',
    addressLine1: warehouse?.addressLine1 ?? '',
    city: warehouse?.city ?? '',
    countryCode: warehouse?.countryCode ?? '',
    status: warehouse?.status ?? 'active',
  };
}

function warehouseToInput(data: WarehouseFormData, warehouse: WarehouseRow | null) {
  const isEdit = !!warehouse;
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    warehouseType: data.warehouseType,
    addressLine1: optionalText(data.addressLine1, isEdit),
    city: optionalText(data.city, isEdit),
    countryCode: optionalText(data.countryCode.toUpperCase(), isEdit),
    ...(isEdit && { status: data.status }),
  };
}

export function SettingsWarehouses() {
  return (
    <div className="space-y-4">
      <WarehousesList />
      <SettingsBranchWarehouses />
      <LocationsList />
    </div>
  );
}

function WarehousesList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: warehouses = [], isLoading, error: loadError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list() as Promise<WarehouseRow[]>,
  });

  const remove = useMutation({
    mutationFn: (warehouse: WarehouseRow) => warehousesApi.remove(warehouse.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete warehouse')),
  });

  const openDialog = (warehouse: WarehouseRow | null) => {
    setEditing(warehouse);
    setDialogOpen(true);
  };

  const handleDelete = (warehouse: WarehouseRow) => {
    if (!window.confirm(t('Delete warehouse "{name}"?', { name: warehouse.name }))) return;
    setError(null);
    remove.mutate(warehouse);
  };

  return (
    <SettingsSection
      title={t('Warehouses')}
      description={t('Stockrooms and storage sites. Stock is kept at locations inside a warehouse.')}
      action={
        <Button onClick={() => openDialog(null)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          {t('New warehouse')}
        </Button>
      }
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load warehouses'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Type')}</Th>
            <Th>{t('Address')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading warehouses...')}</EmptyRow>
          ) : warehouses.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No warehouses yet.')}</EmptyRow>
          ) : (
            warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs">{warehouse.code}</Td>
                <Td className="font-medium">{warehouse.name}</Td>
                <Td className="capitalize">{t(warehouse.warehouseType)}</Td>
                <Td className="text-gray-600">
                  {[warehouse.addressLine1, warehouse.city, warehouse.countryCode].filter(Boolean).join(', ') ||
                    '—'}
                </Td>
                <Td>
                  <Badge variant={statusVariant(warehouse.status)}>{t(warehouse.status)}</Badge>
                </Td>
                <Td>
                  <RowActions
                    label={warehouse.code}
                    onEdit={() => openDialog(warehouse)}
                    onDelete={() => handleDelete(warehouse)}
                  />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <WarehouseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} warehouse={editing} />
    </SettingsSection>
  );
}

function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Warehouse to edit; null to create a new one
  warehouse: WarehouseRow | null;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!warehouse;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: warehouseToFormData(warehouse),
  });

  useEffect(() => {
    if (open) reset(warehouseToFormData(warehouse));
  }, [open, warehouse, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: WarehouseFormData) => {
    setError(null);
    try {
      const input = warehouseToInput(data, warehouse) as Partial<Warehouse>;
      if (warehouse) {
        await warehousesApi.update(warehouse.id, input);
      } else {
        await warehousesApi.create(input);
      }
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save warehouse'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit warehouse') : t('New warehouse')}</DialogTitle>
          <DialogDescription>{t('A place where stock is stored.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="wh-name" error={errorText(errors.name?.message)}>
              <Input id="wh-name" placeholder={t('Main Stockroom')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="wh-code" error={errorText(errors.code?.message)}>
              <Input id="wh-code" placeholder="MAIN" {...register('code')} />
            </Field>
            <Field label={t('Type')} htmlFor="wh-type">
              <Select id="wh-type" {...register('warehouseType')}>
                <option value="standard">{t('Standard')}</option>
                <option value="transit">{t('Transit')}</option>
                <option value="quarantine">{t('Quarantine')}</option>
              </Select>
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="wh-status">
                <Select id="wh-status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                </Select>
              </Field>
            )}
            <Field label={t('Address')} htmlFor="wh-address" error={errorText(errors.addressLine1?.message)} className="sm:col-span-2">
              <Input id="wh-address" {...register('addressLine1')} />
            </Field>
            <Field label={t('City')} htmlFor="wh-city" error={errorText(errors.city?.message)}>
              <Input id="wh-city" {...register('city')} />
            </Field>
            <Field label={t('Country')} htmlFor="wh-country" error={errorText(errors.countryCode?.message)} hint={t('2 letters, e.g. US')}>
              <Input id="wh-country" maxLength={2} className="uppercase" {...register('countryCode')} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create warehouse')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Locations ----

// What stock at a location may be used for; 'transit' is set by the system only
export const locationStockStatusLabels: Record<LocationStockStatus, string> = {
  sellable: 'Sellable',
  quarantine: 'Quarantine',
  damaged: 'Damaged',
  transit: 'In transit',
};

const stockStatusVariant: Record<LocationStockStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  sellable: 'success',
  quarantine: 'warning',
  damaged: 'danger',
  transit: 'info',
};

// Older rows may only have isSellable
export const locationStockStatus = (location: Pick<StockLocation, 'stockStatus' | 'isSellable'>): LocationStockStatus =>
  location.stockStatus ?? (location.isSellable ? 'sellable' : 'quarantine');

const locationSchema = z.object({
  warehouseId: z.string().min(1, 'Choose a warehouse'),
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().max(100),
  locationType: z.enum(['bin', 'aisle', 'zone']),
  stockStatus: z.enum(['sellable', 'quarantine', 'damaged']),
});

type LocationFormData = z.infer<typeof locationSchema>;

function locationToFormData(location: StockLocation | null, defaultWarehouseId: string): LocationFormData {
  const status = location ? locationStockStatus(location) : 'sellable';
  return {
    warehouseId: location?.warehouseId ?? defaultWarehouseId,
    code: location?.code ?? '',
    name: location?.name ?? '',
    locationType: location?.locationType ?? 'zone',
    stockStatus: status === 'transit' ? 'sellable' : status,
  };
}

function locationToInput(data: LocationFormData, location: StockLocation | null) {
  return {
    warehouseId: data.warehouseId,
    code: data.code.trim(),
    name: optionalText(data.name, !!location),
    locationType: data.locationType,
    // isSellable follows server-side
    stockStatus: data.stockStatus,
  };
}

function LocationsList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: locations = [], isLoading, error: loadError } = useQuery({
    queryKey: ['locations'],
    queryFn: () => stockLocationsApi.list(),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list() as Promise<WarehouseRow[]>,
  });
  const warehouseNames = new Map(warehouses.map((w) => [w.id, w.name]));

  const remove = useMutation({
    mutationFn: (location: StockLocation) => stockLocationsApi.remove(location.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete location')),
  });

  const openDialog = (location: StockLocation | null) => {
    setEditing(location);
    setDialogOpen(true);
  };

  const handleDelete = (location: StockLocation) => {
    if (!window.confirm(t('Delete location "{name}"?', { name: location.name || location.code }))) return;
    setError(null);
    remove.mutate(location);
  };

  return (
    <SettingsSection
      title={t('Stock locations')}
      description={t(
        'Bins, aisles or zones inside a warehouse. Only stock at sellable locations can be sold; quarantine and damaged locations hold stock that cannot.'
      )}
      action={
        <Button
          onClick={() => openDialog(null)}
          disabled={warehouses.length === 0}
          title={warehouses.length === 0 ? t('Create a warehouse first') : undefined}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('New location')}
        </Button>
      }
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load locations'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Warehouse')}</Th>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Type')}</Th>
            <Th>{t('Stock status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading locations...')}</EmptyRow>
          ) : locations.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No locations yet.')}</EmptyRow>
          ) : (
            locations.map((location) => {
              const status = locationStockStatus(location);
              return (
                <tr key={location.id} className="hover:bg-gray-50">
                  <Td>{warehouseNames.get(location.warehouseId) ?? '—'}</Td>
                  <Td className="font-mono text-xs">{location.code}</Td>
                  <Td className="font-medium">{location.name ?? '—'}</Td>
                  <Td className="capitalize">{t(location.locationType)}</Td>
                  <Td>
                    <Badge variant={stockStatusVariant[status]}>{t(locationStockStatusLabels[status])}</Badge>
                  </Td>
                  <Td>
                    {status === 'transit' ? (
                      <Badge title={t('Holds dispatched transfer units. Managed by the system.')}>{t('System')}</Badge>
                    ) : (
                      <RowActions
                        label={location.code}
                        onEdit={() => openDialog(location)}
                        onDelete={() => handleDelete(location)}
                      />
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={editing}
        warehouses={warehouses}
      />
    </SettingsSection>
  );
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
  warehouses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Location to edit; null to create a new one
  location: StockLocation | null;
  warehouses: Warehouse[];
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!location;
  const defaultWarehouseId = warehouses[0]?.id ?? '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: locationToFormData(location, defaultWarehouseId),
  });

  useEffect(() => {
    if (open) reset(locationToFormData(location, defaultWarehouseId));
  }, [open, location, defaultWarehouseId, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: LocationFormData) => {
    setError(null);
    try {
      const input = locationToInput(data, location);
      if (location) {
        await stockLocationsApi.update(location.id, input);
      } else {
        await stockLocationsApi.create(input);
      }
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save location'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit location') : t('New location')}</DialogTitle>
          <DialogDescription>{t('A place inside a warehouse where stock is counted.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Warehouse')} htmlFor="loc-warehouse" error={errorText(errors.warehouseId?.message)}>
              <Select id="loc-warehouse" {...register('warehouseId')}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Type')} htmlFor="loc-type">
              <Select id="loc-type" {...register('locationType')}>
                <option value="zone">{t('Zone')}</option>
                <option value="aisle">{t('Aisle')}</option>
                <option value="bin">{t('Bin')}</option>
              </Select>
            </Field>
            <Field label={t('Name')} htmlFor="loc-name" error={errorText(errors.name?.message)}>
              <Input id="loc-name" placeholder={t('Sales floor')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="loc-code" error={errorText(errors.code?.message)}>
              <Input id="loc-code" placeholder="FLOOR" {...register('code')} />
            </Field>
            <Field
              label={t('Stock status')}
              htmlFor="loc-stock-status"
              className="sm:col-span-2"
              hint={t(
                'Only sellable stock can be sold at the POS. Quarantine and damaged stock is kept apart (e.g. returns to inspect, damaged deliveries).'
              )}
            >
              <Select id="loc-stock-status" {...register('stockStatus')}>
                <option value="sellable">{t('Sellable')}</option>
                <option value="quarantine">{t('Quarantine')}</option>
                <option value="damaged">{t('Damaged')}</option>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create location')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}

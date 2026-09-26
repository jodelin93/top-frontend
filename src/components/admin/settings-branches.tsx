'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, Plus } from 'lucide-react';
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
import {
  optionalText,
  RowActions,
  SettingsSection,
  useLocationOptions,
} from '@/components/admin/settings-shared';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage, isVersionConflict } from '@/lib/api/client';
import { Branch, branchesApi, Register, registersApi } from '@/lib/api/settings';
import { RegisterDrawers } from '@/components/admin/settings-register-drawers';
import { t } from '@/i18n';

// ---- Branches ----

const branchSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required').max(255),
  addressLine1: z.string().max(255),
  addressLine2: z.string().max(255),
  city: z.string().max(100),
  stateProvince: z.string().max(100),
  postalCode: z.string().max(20),
  countryCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Use a 2-letter country code'),
  phone: z.string().max(50),
  email: z.string().trim().max(255).refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Invalid email'),
  timezone: z.string().trim().min(1, 'Timezone is required').max(50),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code'),
  taxNumber: z.string().max(50),
  status: z.enum(['active', 'inactive']),
});

type BranchFormData = z.infer<typeof branchSchema>;

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function branchToFormData(branch: Branch | null, currency: string): BranchFormData {
  return {
    code: branch?.code ?? '',
    name: branch?.name ?? '',
    addressLine1: branch?.addressLine1 ?? '',
    addressLine2: branch?.addressLine2 ?? '',
    city: branch?.city ?? '',
    stateProvince: branch?.stateProvince ?? '',
    postalCode: branch?.postalCode ?? '',
    countryCode: branch?.countryCode ?? '',
    phone: branch?.phone ?? '',
    email: branch?.email ?? '',
    timezone: branch?.timezone ?? browserTimezone(),
    currencyCode: branch?.currencyCode ?? currency,
    taxNumber: branch?.taxNumber ?? '',
    status: branch?.status ?? 'active',
  };
}

function branchToInput(data: BranchFormData, branch: Branch | null) {
  const isEdit = !!branch;
  const opt = (value: string) => optionalText(value, isEdit);
  return {
    code: data.code.trim(),
    name: data.name.trim(),
    addressLine1: opt(data.addressLine1),
    addressLine2: opt(data.addressLine2),
    city: opt(data.city),
    stateProvince: opt(data.stateProvince),
    postalCode: opt(data.postalCode),
    countryCode: opt(data.countryCode.toUpperCase()),
    phone: opt(data.phone),
    email: opt(data.email),
    timezone: data.timezone.trim(),
    currencyCode: data.currencyCode.trim().toUpperCase(),
    taxNumber: opt(data.taxNumber),
    ...(isEdit && { status: data.status }),
  };
}

export function SettingsBranches() {
  return (
    <div className="space-y-4">
      <BranchesList />
      <RegistersList />
    </div>
  );
}

function BranchesList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: branches = [], isLoading, error: loadError } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const remove = useMutation({
    mutationFn: (branch: Branch) => branchesApi.remove(branch.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete branch')),
  });

  const openDialog = (branch: Branch | null) => {
    setEditing(branch);
    setDialogOpen(true);
  };

  const handleDelete = (branch: Branch) => {
    if (!window.confirm(t('Delete branch "{name}"?', { name: branch.name }))) return;
    setError(null);
    remove.mutate(branch);
  };

  return (
    <SettingsSection
      title={t('Branches')}
      description={t('Physical stores. Each register belongs to a branch.')}
      action={
        <Button onClick={() => openDialog(null)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          {t('New branch')}
        </Button>
      }
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load branches'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Address')}</Th>
            <Th>{t('Currency')}</Th>
            <Th>{t('Timezone')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading branches...')}</EmptyRow>
          ) : branches.length === 0 ? (
            <EmptyRow colSpan={7}>{t('No branches yet.')}</EmptyRow>
          ) : (
            branches.map((branch) => (
              <tr key={branch.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs">{branch.code}</Td>
                <Td className="font-medium">{branch.name}</Td>
                <Td className="text-gray-600">
                  {[branch.addressLine1, branch.city, branch.countryCode].filter(Boolean).join(', ') || '—'}
                </Td>
                <Td>{branch.currencyCode}</Td>
                <Td>{branch.timezone}</Td>
                <Td>
                  <Badge variant={statusVariant(branch.status)}>{t(branch.status)}</Badge>
                </Td>
                <Td>
                  <RowActions
                    label={branch.code}
                    onEdit={() => openDialog(branch)}
                    onDelete={() => handleDelete(branch)}
                  />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <BranchFormDialog open={dialogOpen} onOpenChange={setDialogOpen} branch={editing} />
    </SettingsSection>
  );
}

function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Branch to edit; null to create a new one
  branch: Branch | null;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: branchToFormData(branch, currency),
  });

  useEffect(() => {
    if (open) reset(branchToFormData(branch, currency));
  }, [open, branch, currency, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: BranchFormData) => {
    setError(null);
    try {
      const input = branchToInput(data, branch);
      if (branch) {
        await branchesApi.update(branch.id, input, { expectedVersion: branch.version });
      } else {
        await branchesApi.create(input);
      }
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save branch'));
      // Someone else saved it: load their version for the next attempt
      if (isVersionConflict(err)) void queryClient.invalidateQueries({ queryKey: ['branches'] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit branch') : t('New branch')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('Update {name}.', { name: branch.name }) : t('Add a store location.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="branch-name" error={errorText(errors.name?.message)}>
              <Input id="branch-name" placeholder={t('Main Store')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="branch-code" error={errorText(errors.code?.message)}>
              <Input id="branch-code" placeholder="MAIN" {...register('code')} />
            </Field>
            <Field label={t('Address line 1')} htmlFor="branch-address1" error={errorText(errors.addressLine1?.message)}>
              <Input id="branch-address1" {...register('addressLine1')} />
            </Field>
            <Field label={t('Address line 2')} htmlFor="branch-address2" error={errorText(errors.addressLine2?.message)}>
              <Input id="branch-address2" {...register('addressLine2')} />
            </Field>
            <Field label={t('City')} htmlFor="branch-city" error={errorText(errors.city?.message)}>
              <Input id="branch-city" {...register('city')} />
            </Field>
            <Field label={t('State / province')} htmlFor="branch-state" error={errorText(errors.stateProvince?.message)}>
              <Input id="branch-state" {...register('stateProvince')} />
            </Field>
            <Field label={t('Postal code')} htmlFor="branch-postal" error={errorText(errors.postalCode?.message)}>
              <Input id="branch-postal" {...register('postalCode')} />
            </Field>
            <Field label={t('Country')} htmlFor="branch-country" error={errorText(errors.countryCode?.message)} hint={t('2 letters, e.g. US')}>
              <Input id="branch-country" maxLength={2} className="uppercase" {...register('countryCode')} />
            </Field>
            <Field label={t('Phone')} htmlFor="branch-phone" error={errorText(errors.phone?.message)}>
              <Input id="branch-phone" type="tel" {...register('phone')} />
            </Field>
            <Field label={t('Email')} htmlFor="branch-email" error={errorText(errors.email?.message)}>
              <Input id="branch-email" type="email" {...register('email')} />
            </Field>
            <Field label={t('Timezone')} htmlFor="branch-timezone" error={errorText(errors.timezone?.message)} hint={t('e.g. America/New_York')}>
              <Input id="branch-timezone" {...register('timezone')} />
            </Field>
            <Field label={t('Currency')} htmlFor="branch-currency" error={errorText(errors.currencyCode?.message)}>
              <Input id="branch-currency" maxLength={3} className="uppercase" {...register('currencyCode')} />
            </Field>
            <Field label={t('Tax number')} htmlFor="branch-tax-number" error={errorText(errors.taxNumber?.message)}>
              <Input id="branch-tax-number" {...register('taxNumber')} />
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="branch-status">
                <Select id="branch-status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create branch')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Registers ----

const registerSchema = z.object({
  branchId: z.string().min(1, 'Choose a branch'),
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required').max(100),
  defaultLocationId: z.string(),
  status: z.enum(['active', 'inactive']),
  drawerPolicy: z.enum(['assigned', 'shared']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

function registerToFormData(reg: Register | null, defaultBranchId: string): RegisterFormData {
  return {
    branchId: reg?.branchId ?? defaultBranchId,
    code: reg?.code ?? '',
    name: reg?.name ?? '',
    defaultLocationId: reg?.defaultLocationId ?? '',
    status: reg?.status ?? 'active',
    drawerPolicy: reg?.drawerPolicy ?? 'assigned',
  };
}

function registerToInput(data: RegisterFormData, reg: Register | null) {
  const isEdit = !!reg;
  return {
    branchId: data.branchId,
    code: data.code.trim(),
    name: data.name.trim(),
    defaultLocationId: data.defaultLocationId || (isEdit ? null : undefined),
    drawerPolicy: data.drawerPolicy,
    ...(isEdit && { status: data.status }),
  };
}

// Translated where shown
const noLocationWarning = 'Registers without a stock location cannot sell.';

function RegistersList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Register | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { labelFor } = useLocationOptions();

  const { data: registers = [], isLoading, error: loadError } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));

  const remove = useMutation({
    mutationFn: (reg: Register) => registersApi.remove(reg.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registers'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete register')),
  });

  const openDialog = (reg: Register | null) => {
    setEditing(reg);
    setDialogOpen(true);
  };

  const handleDelete = (reg: Register) => {
    if (!window.confirm(t('Delete register "{name}"?', { name: reg.name }))) return;
    setError(null);
    remove.mutate(reg);
  };

  return (
    <SettingsSection
      title={t('Registers')}
      description={`${t("Checkout stations. Sales deduct stock from the register's stock location.")} ${t(noLocationWarning)}`}
      action={
        <Button
          onClick={() => openDialog(null)}
          disabled={branches.length === 0}
          title={branches.length === 0 ? t('Create a branch first') : undefined}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('New register')}
        </Button>
      }
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load registers'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Branch')}</Th>
            <Th>{t('Stock location')}</Th>
            <Th>{t('Cash drawers')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading registers...')}</EmptyRow>
          ) : registers.length === 0 ? (
            <EmptyRow colSpan={7}>{t('No registers yet.')}</EmptyRow>
          ) : (
            registers.map((reg) => (
              <tr key={reg.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs">{reg.code}</Td>
                <Td className="font-medium">{reg.name}</Td>
                <Td>{branchNames.get(reg.branchId) ?? '—'}</Td>
                <Td>
                  {reg.defaultLocationId ? (
                    labelFor(reg.defaultLocationId)
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      {t('None — cannot sell')}
                    </span>
                  )}
                </Td>
                <Td className="text-sm">
                  {reg.drawerPolicy === 'shared' ? t('Shared drawer') : t('One cashier per drawer')}
                </Td>
                <Td>
                  <Badge variant={statusVariant(reg.status)}>{t(reg.status)}</Badge>
                </Td>
                <Td>
                  <RowActions label={reg.code} onEdit={() => openDialog(reg)} onDelete={() => handleDelete(reg)} />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <RegisterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        register={editing}
        branches={branches}
      />
    </SettingsSection>
  );
}

function RegisterFormDialog({
  open,
  onOpenChange,
  register: reg,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Register to edit; null to create a new one
  register: Register | null;
  branches: Branch[];
}) {
  const queryClient = useQueryClient();
  const { options: locations } = useLocationOptions();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!reg;
  const defaultBranchId = branches[0]?.id ?? '';

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerToFormData(reg, defaultBranchId),
  });

  useEffect(() => {
    if (open) reset(registerToFormData(reg, defaultBranchId));
  }, [open, reg, defaultBranchId, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      const input = registerToInput(data, reg);
      if (reg) {
        await registersApi.update(reg.id, input, { expectedVersion: reg.version });
      } else {
        await registersApi.create(input);
      }
      await queryClient.invalidateQueries({ queryKey: ['registers'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save register'));
      // Someone else saved it: load their version for the next attempt
      if (isVersionConflict(err)) void queryClient.invalidateQueries({ queryKey: ['registers'] });
    }
  };

  const hasLocation = !!useWatch({ control, name: 'defaultLocationId' });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit register') : t('New register')}</DialogTitle>
          <DialogDescription>{t('A checkout station in one of your branches.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="reg-name" error={errorText(errors.name?.message)}>
              <Input id="reg-name" placeholder={t('Register 1')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="reg-code" error={errorText(errors.code?.message)}>
              <Input id="reg-code" placeholder="REG1" {...register('code')} />
            </Field>
            <Field label={t('Branch')} htmlFor="reg-branch" error={errorText(errors.branchId?.message)}>
              <Select id="reg-branch" {...register('branchId')}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="reg-status">
                <Select id="reg-status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                </Select>
              </Field>
            )}
            <Field label={t('Stock location')} htmlFor="reg-location" className="sm:col-span-2">
              <Select id="reg-location" {...register('defaultLocationId')}>
                <option value="">{t('No stock location')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                    {!l.isSellable && ` (${t('not sellable')})`}
                  </option>
                ))}
              </Select>
              {!hasLocation && (
                <p className="flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t(noLocationWarning)}
                </p>
              )}
            </Field>
            <Field
              label={t('Drawer policy')}
              htmlFor="reg-drawer-policy"
              className="sm:col-span-2"
              hint={t(
                'One cashier per drawer: each cashier opens their own shift on a free drawer. Shared: cashiers work on the drawer shift together, each sale keeps its cashier and the drawer is counted once.'
              )}
            >
              <Select id="reg-drawer-policy" {...register('drawerPolicy')}>
                <option value="assigned">{t('One cashier per drawer')}</option>
                <option value="shared">{t('Shared drawer')}</option>
              </Select>
            </Field>
          </div>
          {reg && <RegisterDrawers registerId={reg.id} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create register')}
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

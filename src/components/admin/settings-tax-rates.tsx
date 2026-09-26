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
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { TaxRate, taxRatesApi } from '@/lib/api/settings';
import { t } from '@/i18n';

const taxRateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required'),
  rate: z
    .string()
    .trim()
    .min(1, 'Rate is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, 'Enter 0–100'),
  countryCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z]{2}$/.test(v), 'Use a 2-letter country code'),
  stateProvince: z.string().max(100),
  status: z.enum(['active', 'inactive']),
});

type TaxRateFormData = z.infer<typeof taxRateSchema>;

function toFormData(taxRate?: TaxRate | null): TaxRateFormData {
  return {
    code: taxRate?.code ?? '',
    name: text(taxRate?.name),
    rate: taxRate ? String(taxRate.rate) : '',
    countryCode: taxRate?.countryCode ?? '',
    stateProvince: taxRate?.stateProvince ?? '',
    status: taxRate?.status ?? 'active',
  };
}

function toInput(data: TaxRateFormData, taxRate?: TaxRate | null) {
  const isEdit = !!taxRate;
  return {
    code: data.code.trim(),
    // Keep other locales intact when editing the English name
    name: { ...taxRate?.name, en: data.name.trim() },
    rate: Number(data.rate),
    countryCode: optionalText(data.countryCode.toUpperCase(), isEdit),
    stateProvince: optionalText(data.stateProvince, isEdit),
    ...(isEdit && { status: data.status }),
  };
}

export function SettingsTaxRates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: taxRates = [], isLoading, error: loadError } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: () => taxRatesApi.list(),
  });

  const remove = useMutation({
    mutationFn: (taxRate: TaxRate) => taxRatesApi.remove(taxRate.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-rates'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete tax rate')),
  });

  const openDialog = (taxRate: TaxRate | null) => {
    setEditing(taxRate);
    setDialogOpen(true);
  };

  const handleDelete = (taxRate: TaxRate) => {
    if (!window.confirm(t('Delete tax rate "{name}"?', { name: text(taxRate.name, taxRate.code) }))) return;
    setError(null);
    remove.mutate(taxRate);
  };

  return (
    <SettingsSection
      title={t('Tax rates')}
      description={t('Percentage rates applied to sales. Choose the default rate on the General tab.')}
      action={
        <Button onClick={() => openDialog(null)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          {t('New tax rate')}
        </Button>
      }
    >
      <div className="empty:hidden p-4 pb-0">
        <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load tax rates'))}</ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Rate')}</Th>
            <Th>{t('Region')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading tax rates...')}</EmptyRow>
          ) : taxRates.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No tax rates yet.')}</EmptyRow>
          ) : (
            taxRates.map((taxRate) => (
              <tr key={taxRate.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs">{taxRate.code}</Td>
                <Td className="font-medium">{text(taxRate.name, '—')}</Td>
                <Td>{Number(taxRate.rate)}%</Td>
                <Td>
                  {[taxRate.stateProvince, taxRate.countryCode].filter(Boolean).join(', ') || '—'}
                </Td>
                <Td>
                  <Badge variant={statusVariant(taxRate.status)}>{t(taxRate.status)}</Badge>
                </Td>
                <Td>
                  <RowActions
                    label={taxRate.code}
                    onEdit={() => openDialog(taxRate)}
                    onDelete={() => handleDelete(taxRate)}
                  />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <TaxRateFormDialog open={dialogOpen} onOpenChange={setDialogOpen} taxRate={editing} />
    </SettingsSection>
  );
}

function TaxRateFormDialog({
  open,
  onOpenChange,
  taxRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Tax rate to edit; null to create a new one
  taxRate: TaxRate | null;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!taxRate;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaxRateFormData>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: toFormData(taxRate),
  });

  useEffect(() => {
    if (open) reset(toFormData(taxRate));
  }, [open, taxRate, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: TaxRateFormData) => {
    setError(null);
    try {
      const input = toInput(data, taxRate);
      if (taxRate) {
        await taxRatesApi.update(taxRate.id, input as Partial<TaxRate>);
      } else {
        await taxRatesApi.create(input as Partial<TaxRate>);
      }
      await queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save tax rate'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit tax rate') : t('New tax rate')}</DialogTitle>
          <DialogDescription>{t('Only percentage rates are supported.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="tax-name" error={errorText(errors.name?.message)}>
              <Input id="tax-name" placeholder={t('Sales tax')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="tax-code" error={errorText(errors.code?.message)}>
              <Input id="tax-code" placeholder="VAT" {...register('code')} />
            </Field>
            <Field label={t('Rate (%)')} htmlFor="tax-rate" error={errorText(errors.rate?.message)}>
              <Input id="tax-rate" inputMode="decimal" placeholder="8.25" {...register('rate')} />
            </Field>
            <Field label={t('Country')} htmlFor="tax-country" error={errorText(errors.countryCode?.message)} hint={t('2 letters, e.g. US')}>
              <Input id="tax-country" maxLength={2} className="uppercase" {...register('countryCode')} />
            </Field>
            <Field label={t('State / province')} htmlFor="tax-state" error={errorText(errors.stateProvince?.message)}>
              <Input id="tax-state" {...register('stateProvince')} />
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="tax-status">
                <Select id="tax-status" {...register('status')}>
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
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create tax rate')}
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

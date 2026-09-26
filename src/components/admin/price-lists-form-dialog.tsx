'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { branchesApi } from '@/lib/api/settings';
import { PriceList, priceListsApi, PriceListType } from '@/lib/api/price-lists';
import { t } from '@/i18n';

export const priceListTypes: { value: PriceListType; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: 'Applied automatically at the POS.' },
  { value: 'promotional', label: 'Promotional', hint: 'Applied automatically, usually for a limited time.' },
  { value: 'wholesale', label: 'Wholesale', hint: 'Only applied when chosen at the POS.' },
  { value: 'member', label: 'Member', hint: 'Only applied when chosen at the POS.' },
];

const priceListSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required').max(50),
    name: z.string().trim().min(1, 'Name is required'),
    priceListType: z.enum(['standard', 'promotional', 'wholesale', 'member']),
    currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code'),
    branchId: z.string(),
    validFrom: z.string(),
    validTo: z.string(),
    priority: z.string().regex(/^-?\d+$/, 'Must be a whole number'),
    status: z.enum(['active', 'inactive', 'scheduled']),
  })
  .refine((d) => !d.validFrom || !d.validTo || new Date(d.validTo) > new Date(d.validFrom), {
    message: 'Must be after the start date',
    path: ['validTo'],
  });

type PriceListFormData = z.infer<typeof priceListSchema>;

// ISO timestamp → value for <input type="datetime-local"> (local time, no seconds)
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toFormData(priceList: PriceList | null, currency: string): PriceListFormData {
  return {
    code: priceList?.code ?? '',
    name: text(priceList?.name),
    priceListType: priceList?.priceListType ?? 'standard',
    currencyCode: priceList?.currencyCode ?? currency,
    branchId: priceList?.branchId ?? '',
    validFrom: toLocalInput(priceList?.validFrom),
    validTo: toLocalInput(priceList?.validTo),
    priority: String(priceList?.priority ?? 0),
    status: priceList?.status ?? 'active',
  };
}

// Empty fields are omitted on create and cleared (null) on update
function toInput(data: PriceListFormData, priceList: PriceList | null) {
  const empty = priceList ? null : undefined;
  const date = (value: string) => (value ? new Date(value).toISOString() : empty);
  return {
    code: data.code.trim(),
    // Keep other locales intact when editing the English name
    name: { ...priceList?.name, en: data.name.trim() },
    priceListType: data.priceListType,
    currencyCode: data.currencyCode.trim().toUpperCase(),
    branchId: data.branchId || empty,
    validFrom: date(data.validFrom),
    validTo: date(data.validTo),
    priority: Number(data.priority),
    ...(priceList && { status: data.status }),
  };
}

export function PriceListFormDialog({
  open,
  onOpenChange,
  priceList,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Price list to edit; null to create a new one
  priceList: PriceList | null;
  onSaved?: (priceList: PriceList) => void;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!priceList;

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceListFormData>({
    resolver: zodResolver(priceListSchema),
    defaultValues: toFormData(priceList, currency),
  });

  useEffect(() => {
    if (open) reset(toFormData(priceList, currency));
  }, [open, priceList, currency, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: PriceListFormData) => {
    setError(null);
    try {
      const input = toInput(data, priceList);
      const saved = priceList
        ? await priceListsApi.update(priceList.id, input)
        : await priceListsApi.create(input);
      await queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      onSaved?.(saved);
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save price list'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit price list') : t('New price list')}</DialogTitle>
          <DialogDescription>
            {t(
              'Standard and promotional lists apply automatically at the POS (highest priority wins). Wholesale and member lists only apply when chosen.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="pl-name" error={errors.name?.message && t(errors.name.message)}>
              <Input id="pl-name" placeholder={t('Summer sale')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="pl-code" error={errors.code?.message && t(errors.code.message)}>
              <Input id="pl-code" placeholder={t('SUMMER')} {...register('code')} />
            </Field>
            <Field label={t('Type')} htmlFor="pl-type">
              <Select id="pl-type" {...register('priceListType')}>
                {priceListTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(type.label)} — {t(type.hint)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Currency')} htmlFor="pl-currency" error={errors.currencyCode?.message && t(errors.currencyCode.message)}>
              <Input id="pl-currency" maxLength={3} className="uppercase" {...register('currencyCode')} />
            </Field>
            <Field label={t('Branch')} htmlFor="pl-branch">
              <Select id="pl-branch" {...register('branchId')}>
                <option value="">{t('All branches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('Priority')}
              htmlFor="pl-priority"
              error={errors.priority?.message && t(errors.priority.message)}
              hint={t('Higher wins when several lists apply.')}
            >
              <Input id="pl-priority" inputMode="numeric" {...register('priority')} />
            </Field>
            <Field label={t('Valid from')} htmlFor="pl-from" hint={t('Leave empty to start immediately.')}>
              <Input id="pl-from" type="datetime-local" {...register('validFrom')} />
            </Field>
            <Field label={t('Valid to')} htmlFor="pl-to" error={errors.validTo?.message && t(errors.validTo.message)} hint={t('Leave empty for no end date.')}>
              <Input id="pl-to" type="datetime-local" {...register('validTo')} />
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="pl-status">
                <Select id="pl-status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="scheduled">{t('Scheduled')}</option>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create price list')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

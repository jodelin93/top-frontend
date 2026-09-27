'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, SettingsSection } from '@/components/admin/settings-shared';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { settingsApi, StoreSettings } from '@/lib/api/settings';
import { formatDateTime, nowLocalInput } from '@/lib/format';
import { t } from '@/i18n';

const securitySchema = z.object({
  offlineLeaseHours: z
    .string()
    .regex(/^\d+$/, 'Whole hours')
    .refine((v) => Number(v) >= 1 && Number(v) <= 168, 'Between 1 and 168 hours'),
  // Offline limits (0 = no limit)
  offlineMaxSaleAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount (0 = no limit)'),
  offlineMaxSales: z
    .string()
    .regex(/^\d+$/, 'Whole number (0 = no limit)')
    .refine((v) => Number(v) <= 100_000, 'At most 100000'),
  offlineMaxTotal: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount (0 = no limit)'),
  requireMfaForAdmins: z.boolean(),
  // Optional: schedule the change (local date/time); empty = now
  effectiveFrom: z
    .string()
    .refine((v) => !v || new Date(v).getTime() > Date.now(), 'Choose a time in the future, or leave empty'),
  note: z.string().max(255),
});

type SecurityFormData = z.infer<typeof securitySchema>;

const toFormData = (settings?: StoreSettings): SecurityFormData => ({
  offlineLeaseHours: String(settings?.offlineLeaseHours ?? 24),
  offlineMaxSaleAmount: String(settings?.offlineMaxSaleAmount ?? 0),
  offlineMaxSales: String(settings?.offlineMaxSales ?? 500),
  offlineMaxTotal: String(settings?.offlineMaxTotal ?? 0),
  requireMfaForAdmins: settings?.requireMfaForAdmins ?? false,
  effectiveFrom: '',
  note: '',
});

/**
 * Offline selling window and limits, and the two-factor requirement for admins.
 * Changes can take effect now or at a scheduled time (see the History tab).
 */
export function SettingsSecurity() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SecurityFormData>({ resolver: zodResolver(securitySchema), defaultValues: toFormData(settings) });

  useEffect(() => {
    if (settings) reset(toFormData(settings));
  }, [settings, reset]);

  const onSubmit = async (data: SecurityFormData) => {
    setError(null);
    setSaved(null);
    try {
      const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom).toISOString() : undefined;
      await settingsApi.update({
        offlineLeaseHours: Number(data.offlineLeaseHours),
        offlineMaxSaleAmount: Number(data.offlineMaxSaleAmount),
        offlineMaxSales: Number(data.offlineMaxSales),
        offlineMaxTotal: Number(data.offlineMaxTotal),
        requireMfaForAdmins: data.requireMfaForAdmins,
        effectiveFrom,
        note: data.note.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(
        effectiveFrom
          ? t('Change scheduled for {date}.', { date: formatDateTime(effectiveFrom) })
          : t('Settings saved.')
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save settings'));
    }
  };

  if (isLoading) return <p className="py-10 text-center text-sm text-gray-400">{t('Loading settings...')}</p>;

  return (
    <SettingsSection
      title={t('Offline & security')}
      description={t('How long and how much tills may sell without a connection, and two-factor authentication for admins.')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
        <ErrorMessage>{error}</ErrorMessage>
        {saved && !isDirty && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{saved}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t('Offline selling window (hours)')}
            htmlFor="offlineLeaseHours"
            error={errorText(errors.offlineLeaseHours?.message)}
            hint={t('A till that loses its connection can keep selling this long after it was last online. After that it locks until it reconnects.')}
          >
            <Input id="offlineLeaseHours" inputMode="numeric" {...register('offlineLeaseHours')} />
          </Field>
          <Field
            label={t('Largest offline sale')}
            htmlFor="offlineMaxSaleAmount"
            error={errorText(errors.offlineMaxSaleAmount?.message)}
            hint={t('A single sale above this amount is still recorded offline, but sent to the review queue. 0 = no limit.')}
          >
            <Input id="offlineMaxSaleAmount" inputMode="decimal" {...register('offlineMaxSaleAmount')} />
          </Field>
          <Field
            label={t('Offline sales per window')}
            htmlFor="offlineMaxSales"
            error={errorText(errors.offlineMaxSales?.message)}
            hint={t('How many sales a till may ring up offline before it must reconnect. 0 = no limit.')}
          >
            <Input id="offlineMaxSales" inputMode="numeric" {...register('offlineMaxSales')} />
          </Field>
          <Field
            label={t('Offline sales total per window')}
            htmlFor="offlineMaxTotal"
            error={errorText(errors.offlineMaxTotal?.message)}
            hint={t('Total value a till may sell offline before it must reconnect. 0 = no limit.')}
          >
            <Input id="offlineMaxTotal" inputMode="decimal" {...register('offlineMaxTotal')} />
          </Field>
          <div className="sm:pt-7">
            <CheckboxField
              label={t('Require two-factor authentication for admins')}
              hint={t('Staff who can manage users, roles, settings or view the audit log must turn on two-factor before they can do anything else.')}
              {...register('requireMfaForAdmins')}
            />
          </div>
          <Field
            label={t('Takes effect')}
            htmlFor="effectiveFrom"
            error={errorText(errors.effectiveFrom?.message)}
            hint={t('Leave empty to apply now, or pick a future date and time to schedule the change.')}
          >
            <Input id="effectiveFrom" type="datetime-local" min={nowLocalInput()} {...register('effectiveFrom')} />
          </Field>
          <Field label={t('Note (optional)')} htmlFor="note" error={errorText(errors.note?.message)} hint={t('Shown in the settings history.')}>
            <Input id="note" maxLength={255} {...register('note')} />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isDirty} className="bg-blue-600 text-white hover:bg-blue-700">
            {isSubmitting ? t('Saving...') : t('Save')}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}

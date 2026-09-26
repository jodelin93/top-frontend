'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, SettingsSection } from '@/components/admin/settings-shared';
import { SaveBar, useSettingsForm } from '@/components/admin/settings-form';
import { TransferSettingsDialog } from '@/components/admin/inventory-transfer-settings';
import { SettingsWeightedBarcodes } from '@/components/admin/settings-weighted-barcodes';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { settingsApi, StoreSettings, taxRatesApi } from '@/lib/api/settings';
import { LANGUAGES, t } from '@/i18n';

const generalSchema = z.object({
  storeName: z.string().trim().min(1, 'Store name is required').max(255),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code, e.g. USD'),
  pricesIncludeTax: z.boolean(),
  defaultTaxRateId: z.string(),
  lowStockThreshold: z.string().regex(/^\d+$/, 'Must be a whole number'),
  allowZeroValueSales: z.boolean(),
  language: z.enum(['en', 'fr']),
  // Months until a gift card sold expires (0 = never)
  giftCardExpiryMonths: z
    .string()
    .regex(/^\d+$/, 'Must be a whole number')
    .refine((v) => Number(v) <= 120, 'At most 120 months'),
});

type GeneralFormData = z.infer<typeof generalSchema>;

function toFormData(settings?: StoreSettings): GeneralFormData {
  return {
    storeName: settings?.storeName ?? '',
    currencyCode: settings?.currencyCode ?? 'USD',
    pricesIncludeTax: settings?.pricesIncludeTax ?? false,
    defaultTaxRateId: settings?.defaultTaxRateId ?? '',
    lowStockThreshold: String(settings?.lowStockThreshold ?? 5),
    allowZeroValueSales: settings?.allowZeroValueSales ?? false,
    language: settings?.language === 'fr' ? 'fr' : 'en',
    giftCardExpiryMonths: String(settings?.giftCardExpiryMonths ?? 0),
  };
}

export function SettingsGeneral() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error: loadError } = useStoreSettings();
  const { data: taxRates = [] } = useQuery({ queryKey: ['tax-rates'], queryFn: () => taxRatesApi.list() });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Reused when a failed save is retried; a new one after each successful save
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: toFormData(settings),
  });

  useEffect(() => {
    if (settings) reset(toFormData(settings));
  }, [settings, reset]);

  const onSubmit = async (data: GeneralFormData) => {
    setError(null);
    setSaved(false);
    try {
      await settingsApi.update(
        {
          storeName: data.storeName.trim(),
          currencyCode: data.currencyCode.trim().toUpperCase(),
          pricesIncludeTax: data.pricesIncludeTax,
          defaultTaxRateId: data.defaultTaxRateId || null,
          lowStockThreshold: Number(data.lowStockThreshold),
          allowZeroValueSales: data.allowZeroValueSales,
          language: data.language,
          giftCardExpiryMonths: Number(data.giftCardExpiryMonths),
        },
        idempotencyKey
      );
      setIdempotencyKey(newIdempotencyKey());
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save settings'));
    }
  };

  // Inactive rates are only listed when currently selected
  const selectableRates = taxRates.filter((rate) => rate.status === 'active' || rate.id === settings?.defaultTaxRateId);

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-gray-400">{t('Loading settings...')}</p>;
  }

  return (
    <>
      <SettingsSection title={t('General')} description={t('Store details, tax behaviour and receipt text.')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
          <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load settings'))}</ErrorMessage>
          {saved && !isDirty && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{t('Settings saved.')}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Store name')} htmlFor="storeName" error={errorText(errors.storeName?.message)}>
              <Input id="storeName" {...register('storeName')} />
            </Field>
            <Field
              label={t('Currency')}
              htmlFor="currencyCode"
              error={errorText(errors.currencyCode?.message)}
              hint={t('3-letter ISO code, e.g. USD')}
            >
              <Input id="currencyCode" maxLength={3} className="uppercase" {...register('currencyCode')} />
            </Field>
            <Field
              label={t('Default tax rate')}
              htmlFor="defaultTaxRateId"
              hint={taxRates.length === 0 ? t('Add tax rates on the Tax rates tab.') : t('Applied to every sale.')}
            >
              <Select id="defaultTaxRateId" {...register('defaultTaxRateId')}>
                <option value="">{t('No tax')}</option>
                {selectableRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {text(rate.name, rate.code)} ({Number(rate.rate)}%)
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('Low-stock threshold')}
              htmlFor="lowStockThreshold"
              error={errorText(errors.lowStockThreshold?.message)}
              hint={t('Used for products without their own reorder point.')}
            >
              <Input id="lowStockThreshold" inputMode="numeric" {...register('lowStockThreshold')} />
            </Field>
            <Field
              label={t('Language')}
              htmlFor="language"
              hint={t(
                'Default language for everyone in the store. Each person can still choose their own language from the menu.'
              )}
            >
              <Select id="language" {...register('language')}>
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('Gift cards expire after (months)')}
              htmlFor="giftCardExpiryMonths"
              error={errorText(errors.giftCardExpiryMonths?.message)}
              hint={t('For gift cards sold from now on; 0 = they never expire. What is left on an expired card is written off.')}
            >
              <Input id="giftCardExpiryMonths" inputMode="numeric" {...register('giftCardExpiryMonths')} />
            </Field>
            <div className="sm:col-span-2">
              <CheckboxField
                label={t('Prices include tax')}
                hint={t('When ticked, tax is extracted from shelf prices instead of added on top.')}
                {...register('pricesIncludeTax')}
              />
            </div>
            <div className="sm:col-span-2">
              <CheckboxField
                label={t('Allow sales with a total of 0.00')}
                hint={t(
                  'Free replacements and giveaways complete without payment. Needs the "discounts above the store limit" permission or a manager.'
                )}
                {...register('allowZeroValueSales')}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting ? t('Saving...') : t('Save settings')}
            </Button>
          </div>
        </form>
      </SettingsSection>
      <SettingsInventoryPurchasing />
      <SettingsWeightedBarcodes />
    </>
  );
}

const INVENTORY_KEYS = [
  'purchaseApprovalThreshold',
  'purchaseOverReceiptTolerance',
  'purchaseInvoiceVarianceTolerance',
  'countVarianceTolerance',
] as const;

const TRANSFER_APPROVAL_LABELS: Record<StoreSettings['transferApprovalMode'], string> = {
  never: 'Transfers never need approval before dispatch.',
  threshold: 'Transfers worth more than {amount} at cost need approval before dispatch.',
  always: 'Every transfer needs approval before dispatch.',
};

/**
 * Approval limits of purchasing, stock counts and transfers (transfers have their own dialog)
 */
export function SettingsInventoryPurchasing() {
  const form = useSettingsForm(INVENTORY_KEYS);
  const [transferSettingsOpen, setTransferSettingsOpen] = useState(false);
  if (form.isLoading || !form.settings) return null;
  const v = form.values;
  const { currencyCode, transferApprovalMode = 'never' } = form.settings;
  const number = (value: string) => (value === '' ? 0 : Number(value));
  const percent = (key: (typeof INVENTORY_KEYS)[number], label: string, hint: string, max: number) => (
    <Field label={label} htmlFor={key} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          id={key}
          type="number"
          min={0}
          max={max}
          step="0.1"
          value={v[key] ?? 0}
          onChange={(e) => form.set(key, number(e.target.value))}
        />
        <span className="text-sm text-gray-500">%</span>
      </div>
    </Field>
  );

  return (
    <SettingsSection
      title={t('Inventory & purchasing')}
      description={t('When purchase orders, deliveries, supplier invoices, stock counts and transfers need a manager.')}
    >
      <div className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('Purchase order approval above ({currency})', {
              currency: currencyCode,
            })}
            htmlFor="purchaseApprovalThreshold"
            hint={t('Orders with a larger total need "Approve purchase orders". 0 = every order.')}
          >
            <Input
              id="purchaseApprovalThreshold"
              type="number"
              min={0}
              step="0.01"
              value={v.purchaseApprovalThreshold ?? 0}
              onChange={(e) => form.set('purchaseApprovalThreshold', number(e.target.value))}
            />
          </Field>
          {percent(
            'purchaseOverReceiptTolerance',
            t('Over-receipt tolerance on purchase orders (%)'),
            t('Receiving more than was ordered, up to this % of it, needs no approval.'),
            1000
          )}
          {percent(
            'purchaseInvoiceVarianceTolerance',
            t('Supplier invoice price tolerance (%)'),
            t('An invoice price above the order price by more than this % needs approval.'),
            100
          )}
          <Field
            label={t('Stock count variance tolerance (units)')}
            htmlFor="countVarianceTolerance"
            hint={t('Count differences larger than this need "Approve stock count variances".')}
          >
            <Input
              id="countVarianceTolerance"
              type="number"
              min={0}
              step="1"
              value={v.countVarianceTolerance ?? 0}
              onChange={(e) => form.set('countVarianceTolerance', Math.round(number(e.target.value)))}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{t('Transfers')}</div>
            <div className="text-gray-500">
              {t(TRANSFER_APPROVAL_LABELS[transferApprovalMode] ?? TRANSFER_APPROVAL_LABELS.never, {
                amount: `${form.settings.transferApprovalThreshold ?? 0} ${currencyCode}`,
              })}{' '}
              {t('Over-receipt tolerance: {percent}%.', {
                percent: form.settings.transferOverReceiptTolerancePercent ?? 0,
              })}
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setTransferSettingsOpen(true)}>
            {t('Transfer settings')}
          </Button>
        </div>

        <SaveBar form={form} />
      </div>
      {transferSettingsOpen && <TransferSettingsDialog onClose={() => setTransferSettingsOpen(false)} />}
    </SettingsSection>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}

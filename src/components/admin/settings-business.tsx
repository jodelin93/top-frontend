'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { SaveBar, useSettingsForm } from '@/components/admin/settings-form';
import { getErrorMessage } from '@/lib/api/client';
import { settingsApi, StoreSettings } from '@/lib/api/settings';
import { t } from '@/i18n';

const KEYS = [
  'storeName',
  'businessLegalName',
  'businessAddressLine1',
  'businessAddressLine2',
  'businessCity',
  'businessState',
  'businessPostalCode',
  'businessCountry',
  'businessPhone',
  'businessEmail',
  'businessWebsite',
  'businessTaxId',
  'businessRegistrationNumber',
  'returnPolicy',
] as const;

type TextKey = (typeof KEYS)[number];

/**
 * Business identity printed on receipts and invoices
 */
export function SettingsBusiness() {
  const form = useSettingsForm(KEYS);
  const field = (key: TextKey, label: string, props: { placeholder?: string; type?: string } = {}) => (
    <Field label={label} htmlFor={key}>
      <Input
        id={key}
        value={form.values[key] ?? ''}
        onChange={(e) => form.set(key, e.target.value as StoreSettings[TextKey])}
        {...props}
      />
    </Field>
  );

  if (form.isLoading) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;

  return (
    <div className="space-y-4">
      <SettingsSection
        title={t('Business information')}
        description={t("Printed on every receipt and invoice. Leave the address empty to use each branch's own address.")}
      >
        <div className="space-y-6 p-4">
          <LogoUpload logoUrl={form.settings?.businessLogoUrl ?? ''} />

          <div className="grid gap-4 sm:grid-cols-2">
            {field('storeName', t('Store (trading) name'))}
            {field('businessLegalName', t('Legal / company name'), { placeholder: t('e.g. Corner Shop LLC') })}
            {field('businessTaxId', t('Tax ID (NIF / VAT / TIN)'))}
            {field('businessRegistrationNumber', t('Business registration no.'))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('businessAddressLine1', t('Address'))}
            {field('businessAddressLine2', t('Address line 2'))}
            {field('businessCity', t('City'))}
            {field('businessPostalCode', t('Postal code'))}
            {field('businessState', t('State / department'))}
            {field('businessCountry', t('Country'))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {field('businessPhone', t('Phone'), { type: 'tel' })}
            {field('businessEmail', t('Email'), { type: 'email' })}
            {field('businessWebsite', t('Website'), { placeholder: 'www.example.com' })}
          </div>

          <Field
            label={t('Return policy')}
            htmlFor="returnPolicy"
            hint={t('Can be printed at the bottom of receipts (Receipts & printing tab)')}
          >
            <Textarea
              id="returnPolicy"
              rows={3}
              value={form.values.returnPolicy ?? ''}
              onChange={(e) => form.set('returnPolicy', e.target.value)}
              placeholder={t('e.g. Returns accepted within 30 days with receipt.')}
            />
          </Field>

          <SaveBar form={form} />
        </div>
      </SettingsSection>
    </div>
  );
}

function LogoUpload({ logoUrl }: { logoUrl: string }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not update the logo'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-24 w-40 items-center justify-center rounded-md border bg-gray-50">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded logo served by the storage service
          <img src={logoUrl} alt={t('Store logo')} className="max-h-20 max-w-36 object-contain" />
        ) : (
          <span className="text-xs text-gray-400">{t('No logo')}</span>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">{t('Logo')}</div>
        <p className="text-xs text-gray-500">
          {t('JPEG, PNG or WebP, up to 2 MB. Black-and-white logos print best on thermal paper.')}
        </p>
        <div className="flex gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(() => settingsApi.uploadLogo(file));
            }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {busy ? t('Uploading...') : logoUrl ? t('Replace logo') : t('Upload logo')}
          </Button>
          {logoUrl && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => settingsApi.removeLogo())}>
              <Trash2 className="h-4 w-4" />
              {t('Remove')}
            </Button>
          )}
        </div>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    </div>
  );
}

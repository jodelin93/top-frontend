'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { SaveBar, useSettingsForm } from '@/components/admin/settings-form';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const KEYS = [
  'weightedBarcodePrefixes',
  'weightedBarcodeLayout',
  'weightedBarcodeItemCodeLength',
  'weightedBarcodeValueDecimals',
] as const;

// GS1 variable measure prefixes (in-store codes)
const PREFIXES = ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];

/**
 * Weighted / price-embedded barcodes printed by scales (GS1 variable measure,
 * EAN-13 starting with 20–29): which prefixes the till reads as scale labels, and
 * how the digits after the prefix split into the item's PLU and the weight or price.
 */
export function SettingsWeightedBarcodes() {
  const form = useSettingsForm(KEYS);
  if (form.isLoading || !form.settings) return null;
  const v = form.values;
  const prefixes = v.weightedBarcodePrefixes ?? [];
  const layout = v.weightedBarcodeLayout ?? 'weight';
  const itemLength = v.weightedBarcodeItemCodeLength ?? 5;
  const decimals = v.weightedBarcodeValueDecimals ?? 3;
  const valueLength = 10 - itemLength;

  const togglePrefix = (prefix: string) =>
    form.set(
      'weightedBarcodePrefixes',
      prefixes.includes(prefix) ? prefixes.filter((p) => p !== prefix) : [...prefixes, prefix].sort()
    );

  // Worked example with the current layout: prefix, PLU, value, check digit
  const examplePrefix = prefixes[0] ?? '21';
  const examplePlu = '1234'.padStart(itemLength, '0');
  const exampleValue = (layout === 'weight' ? '1250' : '499').padStart(valueLength, '0');
  const exampleNumber = Number(exampleValue) / 10 ** decimals;

  return (
    <SettingsSection
      title={t('Scale labels (weighed items)')}
      description={t(
        'Read the barcodes printed by scales: an EAN-13 starting with 20 to 29 carries the item PLU and its weight or price.'
      )}
    >
      <div className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-1 text-sm font-medium">{t('Prefixes read as scale labels')}</legend>
          <p className="mb-2 text-xs text-gray-500">{t('None selected: scale labels are off.')}</p>
          <div className="flex flex-wrap gap-2">
            {PREFIXES.map((prefix) => {
              const on = prefixes.includes(prefix);
              return (
                <button
                  key={prefix}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePrefix(prefix)}
                  className={cn(
                    'h-9 min-w-12 rounded-md border px-3 text-sm font-medium',
                    on ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {prefix}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('The label holds')} htmlFor="weightedBarcodeLayout">
            <Select
              id="weightedBarcodeLayout"
              value={layout}
              onChange={(e) => {
                const next = e.target.value as 'weight' | 'price';
                form.set('weightedBarcodeLayout', next);
                // Usual decimals: grams (3) for a weight, cents (2) for a price
                form.set('weightedBarcodeValueDecimals', next === 'weight' ? 3 : 2);
              }}
            >
              <option value="weight">{t('The weight')}</option>
              <option value="price">{t('The price')}</option>
            </Select>
          </Field>
          <Field
            label={t('PLU digits')}
            htmlFor="weightedBarcodeItemCodeLength"
            hint={t('Digits of the item code after the prefix.')}
          >
            <Select
              id="weightedBarcodeItemCodeLength"
              value={String(itemLength)}
              onChange={(e) => form.set('weightedBarcodeItemCodeLength', Number(e.target.value))}
            >
              {[4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t('Decimals of the value')}
            htmlFor="weightedBarcodeValueDecimals"
            hint={layout === 'weight' ? t('3 = grams, read as kg.') : t('2 = cents.')}
          >
            <Input
              id="weightedBarcodeValueDecimals"
              type="number"
              min={0}
              max={3}
              step={1}
              value={decimals}
              onChange={(e) =>
                form.set('weightedBarcodeValueDecimals', Math.min(3, Math.max(0, Math.round(Number(e.target.value) || 0))))
              }
            />
          </Field>
        </div>

        <p className="rounded-md bg-gray-50 p-3 font-mono text-sm text-gray-700">
          {examplePrefix} {examplePlu} {exampleValue} C →{' '}
          {layout === 'weight'
            ? t('PLU {plu}, weight {value}', { plu: '1234', value: exampleNumber.toFixed(decimals) })
            : t('PLU {plu}, price {value}', { plu: '1234', value: exampleNumber.toFixed(decimals) })}
        </p>
        <p className="text-xs text-gray-500">
          {t('Give each weighed product its PLU on the product form. A label for an unknown PLU is looked up as an ordinary barcode.')}
        </p>

        <SaveBar form={form} />
      </div>
    </SettingsSection>
  );
}

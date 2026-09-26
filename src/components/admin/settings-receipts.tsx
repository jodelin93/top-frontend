'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/admin/page-header';
import { CheckboxField, SettingsSection } from '@/components/admin/settings-shared';
import { SaveBar, useSettingsForm } from '@/components/admin/settings-form';
import { Receipt } from '@/components/pos/receipt';
import type { Sale } from '@/lib/api/sales';
import type { ReceiptTemplate, StoreSettings } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const KEYS = [
  'receiptTemplate',
  'receiptFormat',
  'receiptFontSize',
  'receiptHeader',
  'receiptFooter',
  'receiptShowLogo',
  'receiptShowBusinessDetails',
  'receiptShowTaxBreakdown',
  'receiptShowSku',
  'receiptShowCashier',
  'receiptShowCustomer',
  'receiptShowLoyalty',
  'receiptShowBarcode',
  'receiptShowReturnPolicy',
  'autoPrintReceipt',
  'receiptCopies',
] as const;

const TEMPLATES: { id: ReceiptTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Every detail: price per unit, discounts, tax, cashier.' },
  { id: 'compact', name: 'Compact', description: 'One line per item. Short receipts that save paper.' },
  { id: 'modern', name: 'Modern', description: 'Clean type, bold framed total, strong separators.' },
];

const TOGGLES: { key: (typeof KEYS)[number]; label: string; hint?: string }[] = [
  { key: 'receiptShowLogo', label: 'Logo', hint: 'Upload it in Business information' },
  { key: 'receiptShowBusinessDetails', label: 'Business details', hint: 'Address, phone, tax and registration numbers' },
  { key: 'receiptShowCashier', label: 'Cashier name' },
  { key: 'receiptShowCustomer', label: 'Customer name' },
  { key: 'receiptShowSku', label: 'Item SKU' },
  { key: 'receiptShowTaxBreakdown', label: 'Tax per rate', hint: 'When a sale mixes tax rates' },
  { key: 'receiptShowLoyalty', label: 'Loyalty points earned and balance' },
  { key: 'receiptShowBarcode', label: 'Barcode of the sale number', hint: 'Scan it to find the sale for a return' },
  { key: 'receiptShowReturnPolicy', label: 'Return policy', hint: 'Text from Business information' },
];

// Sample sale for the live preview
const SAMPLE_SALE: Sale = {
  id: 'preview',
  saleNumber: 'S-000123',
  branchId: 'b',
  registerId: 'r',
  customerId: 'c',
  userId: 'u',
  saleDate: new Date().toISOString(),
  subtotal: 32,
  taxAmount: 2.88,
  discountAmount: 3.2,
  total: 31.68,
  amountPaid: 40,
  changeAmount: 8.32,
  currencyCode: 'USD',
  notes: null,
  status: 'completed',
  items: [
    { id: '1', variantId: 'v1', sku: 'COF-L', productName: 'Coffee', variantName: 'Large', quantity: 2, unitPrice: 4.5, subtotal: 9, discountAmount: 0.9, taxAmount: 0.81, total: 8.91, lineNumber: 1, taxRate: 10 },
    { id: '2', variantId: 'v2', sku: 'MUG-01', productName: 'Ceramic mug', variantName: null, quantity: 1, unitPrice: 23, subtotal: 23, discountAmount: 2.3, taxAmount: 2.07, total: 22.77, lineNumber: 2, taxRate: 10 },
  ],
  payments: [
    { id: 'p1', paymentMethodId: 'm', amount: 40, reference: null, status: 'completed', paymentMethod: { id: 'm', code: 'CASH', name: { en: 'Cash' }, methodType: 'cash', requiresReference: false, opensDrawer: true, status: 'active' } },
  ],
  customer: { id: 'c', code: 'CUST-000001', firstName: 'Ada', lastName: 'Lovelace', loyaltyPoints: 1250 } as Sale['customer'],
  register: { id: 'r', branchId: 'b', code: 'REG-1', name: 'Register 1', defaultLocationId: null, status: 'active' },
  user: { id: 'u', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' },
} as Sale;

export function SettingsReceipts() {
  const form = useSettingsForm(KEYS);
  if (form.isLoading || !form.settings) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;
  const v = form.values;
  const previewSettings = { ...form.settings, ...v } as StoreSettings;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <SettingsSection
        title={t('Receipts & printing')}
        description={t('Choose the receipt model, paper and what each receipt shows.')}
      >
        <div className="space-y-6 p-4">
          <div>
            <div className="mb-2 text-sm font-medium">{t('Receipt model')}</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => form.set('receiptTemplate', template.id)}
                  className={cn(
                    'rounded-lg border-2 p-3 text-left',
                    v.receiptTemplate === template.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  )}
                  aria-pressed={v.receiptTemplate === template.id}
                >
                  <div className="font-medium">{t(template.name)}</div>
                  <div className="text-xs text-gray-500">{t(template.description)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('Paper')} htmlFor="receiptFormat">
              <Select id="receiptFormat" value={v.receiptFormat} onChange={(e) => form.set('receiptFormat', e.target.value as StoreSettings['receiptFormat'])}>
                <option value="80mm">{t('80 mm thermal roll')}</option>
                <option value="58mm">{t('58 mm thermal roll')}</option>
                <option value="a4">{t('A4 invoice')}</option>
                <option value="letter">{t('US Letter invoice')}</option>
              </Select>
            </Field>
            <Field label={t('Text size')} htmlFor="receiptFontSize">
              <Select id="receiptFontSize" value={v.receiptFontSize} onChange={(e) => form.set('receiptFontSize', e.target.value as StoreSettings['receiptFontSize'])}>
                <option value="small">{t('Small')}</option>
                <option value="normal">{t('Normal')}</option>
                <option value="large">{t('Large')}</option>
              </Select>
            </Field>
            <Field label={t('Copies per sale')} htmlFor="receiptCopies" hint={t('e.g. 2 = customer + store copy')}>
              <Input
                id="receiptCopies"
                type="number"
                min={1}
                max={3}
                value={v.receiptCopies}
                onChange={(e) => form.set('receiptCopies', Math.min(3, Math.max(1, Number(e.target.value) || 1)))}
              />
            </Field>
          </div>

          <CheckboxField
            label={t('Print automatically when a sale is completed')}
            hint={t('Opens the print dialog straight away (set your receipt printer as the default printer)')}
            checked={v.autoPrintReceipt}
            onChange={(e) => form.set('autoPrintReceipt', e.target.checked)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Receipt header')} htmlFor="receiptHeader" hint={t('Printed under the store details')}>
              <Textarea id="receiptHeader" rows={3} value={v.receiptHeader} onChange={(e) => form.set('receiptHeader', e.target.value)} placeholder={t('e.g. Welcome! Open 7 days a week')} />
            </Field>
            <Field label={t('Receipt footer')} htmlFor="receiptFooter" hint={t('Printed at the bottom')}>
              <Textarea id="receiptFooter" rows={3} value={v.receiptFooter} onChange={(e) => form.set('receiptFooter', e.target.value)} placeholder={t('e.g. Thank you for your purchase!')} />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">{t('Show on the receipt')}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {TOGGLES.map((toggle) => (
                <CheckboxField
                  key={toggle.key}
                  label={t(toggle.label)}
                  hint={toggle.hint && t(toggle.hint)}
                  checked={Boolean(v[toggle.key])}
                  onChange={(e) => form.set(toggle.key, e.target.checked as never)}
                />
              ))}
            </div>
          </div>

          <SaveBar form={form} />
        </div>
      </SettingsSection>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('Preview')}</span>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t('Print test receipt')}
          </Button>
        </div>
        <div className="max-h-[75vh] overflow-auto rounded-md border bg-white p-4 shadow-sm">
          <Receipt sale={SAMPLE_SALE} settings={previewSettings} />
        </div>
        <p className="text-xs text-gray-500">
          {t('The preview updates as you change options. Unsaved changes are shown too.')}
        </p>
      </div>
    </div>
  );
}

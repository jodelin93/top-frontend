'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { SettingsGeneral } from '@/components/admin/settings-general';
import { ExchangeRateCard } from '@/components/admin/exchange-rate-card';
import { SettingsBusiness } from '@/components/admin/settings-business';
import { SettingsReceipts } from '@/components/admin/settings-receipts';
import { SettingsLoyalty } from '@/components/admin/settings-loyalty';
import { SettingsTaxRates } from '@/components/admin/settings-tax-rates';
import { SettingsPaymentMethods } from '@/components/admin/settings-payment-methods';
import { SettingsBranches } from '@/components/admin/settings-branches';
import { SettingsWarehouses } from '@/components/admin/settings-warehouses';
import { SettingsSecurity } from '@/components/admin/settings-security';
import { SettingsHistory } from '@/components/admin/settings-history';
import { getErrorMessage } from '@/lib/api/client';
import { branchesApi, paymentMethodsApi, registersApi, settingsApi } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { useHelpContext } from '@/help/store';

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'business', label: 'Business information' },
  { id: 'receipts', label: 'Receipts & printing' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'tax-rates', label: 'Tax rates' },
  { id: 'payment-methods', label: 'Payment methods' },
  { id: 'branches', label: 'Branches & registers' },
  { id: 'warehouses', label: 'Warehouses & locations' },
  { id: 'security', label: 'Offline & security' },
  { id: 'history', label: 'History' },
] as const;

type TabId = (typeof tabs)[number]['id'];

// Help topic of each tab (src/help/content)
const SETTINGS_TAB_HELP: Record<TabId, string> = {
  general: 'settings-general',
  business: 'settings-business',
  receipts: 'settings-receipts',
  loyalty: 'settings-loyalty',
  'tax-rates': 'settings-taxes',
  'payment-methods': 'settings-payment-methods',
  branches: 'settings-branches',
  warehouses: 'settings-warehouses',
  security: 'settings-security',
  history: 'settings-history',
};

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('general');
  useHelpContext(SETTINGS_TAB_HELP[tab]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Settings')}
        description={t('Configure your business, receipts, loyalty, taxes, payments and locations.')}
      />

      <SetupCheck />

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium max-md:py-2.5',
              tab === item.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-4">
          <SettingsGeneral />
          <ExchangeRateCard />
        </div>
      )}
      {tab === 'business' && <SettingsBusiness />}
      {tab === 'receipts' && <SettingsReceipts />}
      {tab === 'loyalty' && <SettingsLoyalty />}
      {tab === 'tax-rates' && <SettingsTaxRates />}
      {tab === 'payment-methods' && <SettingsPaymentMethods />}
      {tab === 'branches' && <SettingsBranches />}
      {tab === 'warehouses' && <SettingsWarehouses />}
      {tab === 'security' && <SettingsSecurity />}
      {tab === 'history' && <SettingsHistory />}
    </div>
  );
}

// Warns when the POS is missing the records it needs to take a sale
function SetupCheck() {
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const registers = useQuery({ queryKey: ['registers'], queryFn: () => registersApi.list() });
  const paymentMethods = useQuery({ queryKey: ['payment-methods'], queryFn: () => paymentMethodsApi.list() });

  const initialize = useMutation({
    mutationFn: settingsApi.initialize,
    onSuccess: () =>
      Promise.all(
        ['branches', 'registers', 'payment-methods', 'warehouses', 'locations', 'settings'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] })
        )
      ),
  });

  if (!branches.data || !registers.data || !paymentMethods.data) return null;

  const missing = [
    branches.data.length === 0 && t('a branch'),
    registers.data.length === 0 && t('a register'),
    paymentMethods.data.length === 0 && t('a payment method'),
  ].filter(Boolean) as string[];

  if (missing.length === 0) return null;

  return (
    <Card className="border-amber-300 bg-amber-50">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-2">
          <h2 className="font-semibold text-amber-900">{t('Finish setting up your store')}</h2>
          <p className="text-sm text-amber-900">
            {t(
              'The POS needs at least one branch, one register (with a stock location) and one payment method before it can take sales. Missing: {missing}.',
              { missing: missing.join(', ') }
            )}
          </p>
          <p className="text-sm text-amber-800">
            <strong>{t('Create default setup')}</strong>{' '}
            {t(
              'adds a "Main Store" branch, a "Main Stockroom" warehouse with a "Sales floor" location, "Register 1" and Cash and Card payment methods. Existing records are kept, so it is safe to run again. You can rename or change everything afterwards.'
            )}
          </p>
          <ErrorMessage>
            {initialize.error && getErrorMessage(initialize.error, 'Could not create the default setup')}
          </ErrorMessage>
        </div>
        <Button
          onClick={() => initialize.mutate()}
          disabled={initialize.isPending}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          <Wand2 className="h-4 w-4" />
          {initialize.isPending ? t('Creating...') : t('Create default setup')}
        </Button>
      </div>
    </Card>
  );
}

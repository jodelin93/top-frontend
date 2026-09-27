'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { PurchaseOrdersTab } from '@/components/admin/purchasing-orders';
import { SuppliersTab } from '@/components/admin/purchasing-suppliers';
import { SupplierInvoicesTab } from '@/components/admin/purchasing-invoices';
import { SupplierPaymentsTab } from '@/components/admin/purchasing-payments';
import { SupplierReturnsTab } from '@/components/admin/purchasing-returns';
import { PayablesTab } from '@/components/admin/purchasing-payables';
import { ReorderSuggestionsTab } from '@/components/admin/purchasing-reorder';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Tab = 'orders' | 'suppliers' | 'reorder' | 'returns' | 'invoices' | 'payments' | 'payables';

// Tabs and who sees them
const TABS: { id: Tab; label: string; permissions: string[] }[] = [
  { id: 'orders', label: 'Purchase orders', permissions: ['purchasing.manage', 'purchasing.approve'] },
  { id: 'suppliers', label: 'Suppliers', permissions: ['purchasing.manage', 'purchasing.approve'] },
  { id: 'reorder', label: 'Reorder', permissions: ['purchasing.manage'] },
  { id: 'returns', label: 'Supplier returns', permissions: ['purchasing.manage', 'purchasing.payables'] },
  { id: 'invoices', label: 'Invoices', permissions: ['purchasing.payables', 'purchasing.approve'] },
  { id: 'payments', label: 'Payments', permissions: ['purchasing.payables', 'purchasing.approve'] },
  { id: 'payables', label: 'Payables', permissions: ['purchasing.payables', 'purchasing.approve'] },
];

export default function PurchasingPage() {
  const user = useAuthStore((s) => s.user);
  const visible = TABS.filter((tab) => tab.permissions.some((p) => hasPermission(user, p)));
  const [chosen, setChosen] = useState<Tab | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tab = chosen && visible.some((v) => v.id === chosen) ? chosen : (visible[0]?.id ?? 'orders');

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Purchasing')}
        description={t('Suppliers, purchase orders, deliveries, supplier invoices and what is owed to suppliers.')}
      />

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {visible.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setChosen(item.id);
              setNotice(null);
            }}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium max-md:py-2.5',
              tab === item.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {notice && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</div>}

      {tab === 'orders' && <PurchaseOrdersTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'reorder' && (
        <ReorderSuggestionsTab
          onOrderCreated={(poNumber) =>
            setNotice(t('Draft purchase order {number} created. Review and submit it under Purchase orders.', { number: poNumber }))
          }
        />
      )}
      {tab === 'returns' && <SupplierReturnsTab />}
      {tab === 'invoices' && <SupplierInvoicesTab />}
      {tab === 'payments' && <SupplierPaymentsTab />}
      {tab === 'payables' && <PayablesTab />}
    </div>
  );
}

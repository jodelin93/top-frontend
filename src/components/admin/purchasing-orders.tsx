'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PackagePlus, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage } from '@/components/admin/page-header';
import { useLocationOptions } from '@/components/admin/settings-shared';
import { useDebouncedValue } from '@/components/admin/inventory-variant-picker';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { PurchaseOrderFormDialog } from '@/components/admin/purchasing-order-form-dialog';
import { UnplannedReceiptDialog } from '@/components/admin/purchasing-unplanned-receipt-dialog';
import {
  PurchaseOrderDetailDialog,
  poStatusLabels,
  poStatusVariant,
} from '@/components/admin/purchasing-order-detail-dialog';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { PurchaseOrderDetail, PurchaseOrderStatus, purchaseOrdersApi } from '@/lib/api/purchasing';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Purchase order list with filters; opens the detail / edit dialogs
 */
export function PurchaseOrdersTab() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, 'purchasing.manage');
  const canReceiveUnplanned =
    hasPermission(user, 'purchasing.receive.unplanned') && hasPermission(user, 'inventory.receive');
  const [unplanned, setUnplanned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { labelFor } = useLocationOptions();
  const { data: suppliers = [] } = useSuppliers();
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [editing, setEditing] = useState<PurchaseOrderDetail | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['purchase-orders', status, supplierId, debouncedSearch],
    queryFn: () =>
      purchaseOrdersApi.list({
        status: status || undefined,
        supplierId: supplierId || undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <Card className="bg-white p-6 text-sm text-gray-500">
        {t('You need the "Manage suppliers and purchase orders" permission to see purchase orders.')}
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('Search by PO number or supplier...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus | '')}
          className="lg:w-44"
          aria-label={t('Filter by status')}
        >
          <option value="">{t('All statuses')}</option>
          {Object.entries(poStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </Select>
        <Select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="lg:w-52"
          aria-label={t('Filter by supplier')}
        >
          <option value="">{t('All suppliers')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {canReceiveUnplanned && (
          <Button variant="outline" onClick={() => setUnplanned(true)} disabled={suppliers.length === 0}>
            <PackagePlus className="h-4 w-4" />
            {t('Unplanned receipt')}
          </Button>
        )}
        <Button
          onClick={() => setEditing('new')}
          disabled={suppliers.length === 0}
          title={suppliers.length === 0 ? t('Add a supplier first') : undefined}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t('New order')}
        </Button>
      </div>

      {notice && <div className="m-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load purchase orders')}</ErrorMessage>
        </div>
      )}

      {smallScreen ? (
        // Phones: one card per order instead of a table that scrolls sideways
        <DataCards
          items={orders}
          getKey={(order) => order.id}
          onItemClick={(order) => setOpenId(order.id)}
          loading={isLoading}
          loadingText={t('Loading purchase orders...')}
          emptyText={
            status || supplierId || search ? t('No purchase order matches your filters.') : t('No purchase orders yet.')
          }
        >
          {(order) => (
            <>
              <DataCardHeader
                title={<span className="font-mono text-xs">{order.poNumber}</span>}
                subtitle={order.supplier?.name ?? '—'}
                onTitleClick={() => setOpenId(order.id)}
                badge={<Badge variant={poStatusVariant[order.status]}>{t(poStatusLabels[order.status])}</Badge>}
              />
              <DataCardFields>
                <DataCardField label={t('Deliver to')}>{labelFor(order.locationId, order.location?.code)}</DataCardField>
                <DataCardField label={t('Expected')}>{formatDate(order.expectedDeliveryDate)}</DataCardField>
                <DataCardField label={t('Total')}>
                  <span className="font-medium">{formatMoney(order.total, order.currencyCode)}</span>
                </DataCardField>
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('PO')}</Th>
            <Th>{t('Supplier')}</Th>
            <Th>{t('Deliver to')}</Th>
            <Th>{t('Status')}</Th>
            <Th>{t('Expected')}</Th>
            <Th className="text-right">{t('Total')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading purchase orders...')}</EmptyRow>
          ) : orders.length === 0 ? (
            <EmptyRow colSpan={6}>
              {status || supplierId || search ? t('No purchase order matches your filters.') : t('No purchase orders yet.')}
            </EmptyRow>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setOpenId(order.id)}>
                <Td className="font-mono text-xs font-medium">{order.poNumber}</Td>
                <Td>{order.supplier?.name ?? '—'}</Td>
                <Td className="text-gray-600">{labelFor(order.locationId, order.location?.code)}</Td>
                <Td>
                  <Badge variant={poStatusVariant[order.status]}>{t(poStatusLabels[order.status])}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDate(order.expectedDeliveryDate)}</Td>
                <Td className="text-right">{formatMoney(order.total, order.currencyCode)}</Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      {editing && (
        <PurchaseOrderFormDialog
          order={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setOpenId(saved.id);
          }}
        />
      )}
      {unplanned && (
        <UnplannedReceiptDialog
          onClose={() => setUnplanned(false)}
          onDone={(message) => {
            setUnplanned(false);
            setNotice(message);
          }}
        />
      )}
      {openId && (
        <PurchaseOrderDetailDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onEdit={(order) => {
            setOpenId(null);
            setEditing(order);
          }}
        />
      )}
    </Card>
  );
}

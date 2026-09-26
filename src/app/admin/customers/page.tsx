'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { CustomerFormDialog } from '@/components/admin/customer-form-dialog';
import { CustomerDetailDialog } from '@/components/admin/customer-detail-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { Customer, customerGroupsApi, customerName, customersApi } from '@/lib/api/customers';
import { CustomerGroupsSection } from '@/components/admin/customer-groups-section';
import { CustomerFieldsSection } from '@/components/admin/customer-fields-section';
import { CustomerDuplicatesSection } from '@/components/admin/customer-duplicates-section';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Tab = 'customers' | 'duplicates' | 'groups' | 'fields';
import { formatDate } from '@/lib/format';

type CustomerStatus = Customer['status'];

// English labels, translated at render
const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
};

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('customers');
  const [groupId, setGroupId] = useState('');
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'customers', label: t('Customers'), show: true },
    { key: 'duplicates', label: t('Possible duplicates'), show: hasPermission(user, 'customers.merge') },
    { key: 'groups', label: t('Groups'), show: hasPermission(user, 'customers.manage') },
    { key: 'fields', label: t('Custom fields'), show: hasPermission(user, 'customers.manage') },
  ];
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);

  // Debounce search typing
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers', debouncedSearch, status, groupId],
    queryFn: () =>
      customersApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        groupId: groupId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => customerGroupsApi.list(),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Customers')}
        description={t('Manage customer accounts and loyalty.')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('New customer')}
          </Button>
        }
      />

      <div className="flex gap-1 border-b" role="tablist">
        {tabs
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm',
                tab === item.key ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {item.label}
            </button>
          ))}
      </div>

      {tab === 'duplicates' && <CustomerDuplicatesSection />}
      {tab === 'groups' && <CustomerGroupsSection />}
      {tab === 'fields' && <CustomerFieldsSection />}

      {tab === 'customers' && (
        <Card className="bg-white">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t('Search by name, code, email or phone...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CustomerStatus | '')}
              className="sm:w-44"
              aria-label={t('Filter by status')}
            >
              <option value="">{t('All statuses')}</option>
              <option value="active">{t('Active')}</option>
              <option value="inactive">{t('Inactive')}</option>
              <option value="blocked">{t('Blocked')}</option>
            </Select>
            {groups.length > 0 && (
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="sm:w-44"
                aria-label={t('Filter by group')}
              >
                <option value="">{t('All groups')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {error && (
            <div className="m-4">
              <ErrorMessage>{getErrorMessage(error, 'Could not load customers')}</ErrorMessage>
            </div>
          )}

          <Table>
            <THead>
              <tr>
                <Th>{t('Code')}</Th>
                <Th>{t('Name')}</Th>
                <Th>{t('Email')}</Th>
                <Th>{t('Phone')}</Th>
                <Th>{t('Group')}</Th>
                <Th className="text-right">{t('Points')}</Th>
                <Th>{t('Last purchase')}</Th>
                <Th>{t('Status')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={9}>{t('Loading customers...')}</EmptyRow>
              ) : customers.length === 0 ? (
                <EmptyRow colSpan={9}>
                  {debouncedSearch || status || groupId
                    ? t('No customers match your filters.')
                    : t('No customers yet. Create your first one.')}
                </EmptyRow>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <Td className="font-mono text-xs">{customer.code}</Td>
                    <Td className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setViewing(customer)}
                      >
                        {customerName(customer)}
                      </button>
                    </Td>
                    <Td>{customer.email ?? '—'}</Td>
                    <Td>{customer.phone ?? '—'}</Td>
                    <Td>{customer.group?.name ?? '—'}</Td>
                    <Td className="text-right">{Number(customer.loyaltyPoints).toLocaleString()}</Td>
                    <Td>{formatDate(customer.lastPurchaseAt)}</Td>
                    <Td>
                      <Badge variant={statusVariant(customer.status)}>
                        {t(CUSTOMER_STATUS_LABELS[customer.status] ?? customer.status)}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewing(customer)}
                          aria-label={t('View {code}', { code: customer.code })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(customer)}
                          aria-label={t('Edit {code}', { code: customer.code })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      )}

      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
      <CustomerDetailDialog customer={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

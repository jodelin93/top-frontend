'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { ShiftDetailDialog, shiftStatusVariant } from '@/components/admin/shifts-detail-dialog';
import { ShiftsDenominations } from '@/components/admin/shifts-denominations';
import { ShiftsBusinessDay } from '@/components/admin/shifts-business-day';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { registersApi } from '@/lib/api/settings';
import { ShiftStatus, shiftsApi } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';
import { hasPermission, useAuthStore } from '@/stores/auth-store';

export default function ShiftsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, 'shifts.manage');
  const { data: settings } = useStoreSettings();
  const currency = settings?.currencyCode ?? 'USD';

  const [status, setStatus] = useState<ShiftStatus | ''>('');
  const [registerId, setRegisterId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [varianceOnly, setVarianceOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: registers = [] } = useQuery({ queryKey: ['registers'], queryFn: () => registersApi.list() });
  const { data, isLoading, error } = useQuery({
    queryKey: ['shifts', 'list', status, registerId, from, to, varianceOnly, page],
    queryFn: () =>
      shiftsApi.list({
        status: status || undefined,
        registerId: registerId || undefined,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        varianceOnly: varianceOnly ? 'true' : undefined,
        page,
        limit: 25,
      }),
    placeholderData: (previous) => previous,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Shifts & cash')}
        description={
          canManage
            ? t('Register shifts, cash counts and variances. Open a shift to see its cash movements and reprint the Z-report.')
            : t('Your register shifts and their Z-reports.')
        }
      />

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ShiftStatus | '');
              resetPage();
            }}
            className="md:w-40"
            aria-label={t('Status')}
          >
            <option value="">{t('All statuses')}</option>
            <option value="open">{t('Open')}</option>
            <option value="closing">{t('Counting')}</option>
            <option value="closed">{t('Closed|status')}</option>
          </Select>
          <Select
            value={registerId}
            onChange={(e) => {
              setRegisterId(e.target.value);
              resetPage();
            }}
            className="md:w-48"
            aria-label={t('Register')}
          >
            <option value="">{t('All registers')}</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPage();
            }}
            className="md:w-40"
            aria-label={t('From')}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetPage();
            }}
            className="md:w-40"
            aria-label={t('To')}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={varianceOnly}
              onChange={(e) => {
                setVarianceOnly(e.target.checked);
                resetPage();
              }}
            />
            {t('Variance above tolerance')}
          </label>
        </div>

        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load shifts')}</ErrorMessage>
          </div>
        )}

        <Table>
          <THead>
            <tr>
              <Th>{t('Shift')}</Th>
              <Th>{t('Register')}</Th>
              <Th>{t('Opened')}</Th>
              <Th>{t('Closed')}</Th>
              <Th>{t('Status')}</Th>
              <Th className="text-right">{t('Float')}</Th>
              <Th className="text-right">{t('Expected')}</Th>
              <Th className="text-right">{t('Counted')}</Th>
              <Th className="text-right">{t('Variance')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={9}>{t('Loading...')}</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={9}>{t('No shifts match.')}</EmptyRow>
            ) : (
              rows.map((s) => (
                <tr
                  key={s.id}
                  className={cn('cursor-pointer hover:bg-gray-50', s.overTolerance && 'bg-red-50/60')}
                  onClick={() => setSelected(s.id)}
                >
                  <Td className="font-medium">{s.shiftNumber}</Td>
                  <Td>
                    {s.registerName ?? '—'}
                    {(s.drawerName || s.businessDate) && (
                      <span className="block text-xs text-gray-500">
                        {[s.drawerName, s.businessDate && t('business date {date}', { date: s.businessDate })]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatDateTime(s.openedAt)}
                    <span className="block text-xs text-gray-500">{s.openedByName}</span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatDateTime(s.closedAt)}
                    {s.closedByName && <span className="block text-xs text-gray-500">{s.closedByName}</span>}
                  </Td>
                  <Td>
                    <Badge variant={shiftStatusVariant(s.status)}>
                      {t(s.status === 'closing' ? 'counting' : s.status)}
                    </Badge>
                    {s.forceClosed && <span className="ml-1 text-xs text-amber-700">{t('forced')}</span>}
                    {!!s.lateSalesCount && (
                      <Badge variant="warning" className="ml-1" title={t('Sales uploaded after the shift closed')}>
                        {plural(s.lateSalesCount, '{count} late sale', '{count} late sales')}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{formatMoney(s.openingFloat, s.currencyCode)}</Td>
                  <Td className="text-right tabular-nums">
                    {s.expectedCash === null ? '—' : formatMoney(s.expectedCash, s.currencyCode)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {s.countedCash === null ? '—' : formatMoney(s.countedCash, s.currencyCode)}
                  </Td>
                  <Td
                    className={cn(
                      'text-right font-medium tabular-nums',
                      s.variance !== null && s.variance !== 0 && (s.overTolerance ? 'text-red-600' : 'text-amber-700')
                    )}
                  >
                    {s.variance === null ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {s.overTolerance && <AlertTriangle className="h-3.5 w-3.5" />}
                        {s.variance > 0 ? '+' : ''}
                        {formatMoney(s.variance, s.currencyCode)}
                      </span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3 text-sm text-gray-600">
            <span>
              {t('Page {page} of {totalPages}', { page: meta.page, totalPages: meta.totalPages })} ·{' '}
              {plural(meta.total, '{count} shift', '{count} shifts')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage(page - 1)}>
                {t('Previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage(page + 1)}>
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {canManage && <ShiftsDenominations currency={currency} />}
      {canManage && hasPermission(user, 'settings.manage') && <ShiftsBusinessDay />}

      <ShiftDetailDialog shiftId={selected} onClose={() => setSelected(null)} storeName={settings?.storeName} />
    </div>
  );
}

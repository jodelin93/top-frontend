'use client';

import { Fragment, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { Employee, employeesApi, formatHours } from '@/lib/api/employees';
import { formatDateTime, localIsoDate, nowLocalInput } from '@/lib/format';
import { translateServerNote } from '@/lib/server-texts';
import { t } from '@/i18n';

const isoDay = (d: Date) => localIsoDate(d);

/**
 * Attendance report: hours per employee over a date range, with each clock-in /
 * clock-out. Managers can record a forgotten shift and clock out an open record.
 */
export function EmployeesAttendance({ employees }: { employees: Employee[] }) {
  const queryClient = useQueryClient();
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(today));
  const [employeeId, setEmployeeId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [record, setRecord] = useState({ employeeId: '', clockIn: '', clockOut: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  // Times already worked: not in the future, out after in, at most 24 h
  const recordError = (() => {
    const now = nowLocalInput();
    if ((record.clockIn && record.clockIn > now) || (record.clockOut && record.clockOut > now)) {
      return t('The time cannot be in the future');
    }
    if (record.clockIn && record.clockOut) {
      const length = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
      if (length < 0) return t('The clock-out is before the clock-in');
      if (length > 24 * 3_600_000) return t('A shift cannot last more than 24 hours');
    }
    return undefined;
  })();
  const [busy, setBusy] = useState(false);
  const smallScreen = useSmallScreen();

  const range = {
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  };
  const report = useQuery({
    queryKey: ['employees', 'attendance', range.from, range.to, employeeId],
    queryFn: () => employeesApi.attendanceReport({ ...range, employeeId: employeeId || undefined }),
    enabled: !!from && !!to,
  });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ['employees', 'attendance'] });
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the attendance'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveRecord = async () => {
    const ok = await run(() =>
      employeesApi.recordAttendance(record.employeeId, {
        clockIn: new Date(record.clockIn).toISOString(),
        clockOut: record.clockOut ? new Date(record.clockOut).toISOString() : undefined,
        note: record.note.trim(),
      })
    );
    if (ok) {
      setRecording(false);
      setRecord({ employeeId: '', clockIn: '', clockOut: '', note: '' });
    }
  };

  const closeNow = (attendanceId: string) =>
    run(() => employeesApi.closeAttendance(attendanceId, { clockOut: new Date().toISOString(), note: t('Clocked out by a manager') }));

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center">
        <Input
          type="date"
          max={to || undefined}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="md:w-40"
          aria-label={t('From')}
        />
        <Input
          type="date"
          min={from || undefined}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="md:w-40"
          aria-label={t('To')}
        />
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="md:w-56" aria-label={t('Employee')}>
          <option value="">{t('All employees')}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </Select>
        <div className="md:ml-auto">
          <Button variant="outline" onClick={() => setRecording((v) => !v)}>
            {t('Record hours')}
          </Button>
        </div>
      </div>

      <div className="m-4 space-y-2">
        <ErrorMessage>{error ?? (report.error ? getErrorMessage(report.error, 'Could not load the attendance') : null)}</ErrorMessage>
        {recording && (
          <div className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
            <Field label={t('Employee')} htmlFor="att-employee">
              <Select
                id="att-employee"
                value={record.employeeId}
                onChange={(e) => setRecord({ ...record, employeeId: e.target.value })}
              >
                <option value="">{t('Choose...')}</option>
                {employees
                  .filter((e) => e.status === 'active')
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t('Clock in')} htmlFor="att-in">
              <Input
                id="att-in"
                type="datetime-local"
                max={nowLocalInput()}
                value={record.clockIn}
                onChange={(e) => setRecord({ ...record, clockIn: e.target.value })}
              />
            </Field>
            <Field label={t('Clock out')} htmlFor="att-out" error={recordError}>
              <Input
                id="att-out"
                type="datetime-local"
                min={record.clockIn || undefined}
                max={nowLocalInput()}
                value={record.clockOut}
                onChange={(e) => setRecord({ ...record, clockOut: e.target.value })}
              />
            </Field>
            <Field label={t('Reason')} htmlFor="att-note">
              <Input
                id="att-note"
                value={record.note}
                maxLength={500}
                onChange={(e) => setRecord({ ...record, note: e.target.value })}
                placeholder={t('e.g. forgot to clock in')}
              />
            </Field>
            <div className="flex items-end">
              <Button
                onClick={saveRecord}
                disabled={busy || !record.employeeId || !record.clockIn || record.note.trim().length < 2 || !!recordError}
              >
                {t('Save')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {smallScreen ? (
        <DataCards
          items={report.data?.employees ?? []}
          getKey={(row) => row.employeeId}
          onItemClick={(row) => setExpanded(expanded === row.employeeId ? null : row.employeeId)}
          loading={report.isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No attendance in this period.')}
        >
          {(row) => (
            <>
              <DataCardHeader
                title={row.name}
                subtitle={row.employeeCode || undefined}
                onTitleClick={() => setExpanded(expanded === row.employeeId ? null : row.employeeId)}
                badge={row.open && <span className="text-xs text-green-700">{t('clocked in')}</span>}
              />
              <DataCardFields>
                <DataCardField label={t('Shifts worked')}>
                  <span className="tabular-nums">{row.shifts}</span>
                </DataCardField>
                <DataCardField label={t('Hours')}>
                  <span className="font-medium tabular-nums">{formatHours(row.hours)}</span>
                </DataCardField>
              </DataCardFields>
              {expanded === row.employeeId && (
                <ul className="divide-y rounded-md bg-gray-50 text-xs">
                  {row.records.map((r) => (
                    <li key={r.id} className="space-y-1 p-2">
                      <div className="flex justify-between gap-2">
                        <span className="min-w-0 break-words">
                          {formatDateTime(r.clockIn)} → {r.clockOut ? formatDateTime(r.clockOut) : t('still clocked in')}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatHours(r.hours)}</span>
                      </div>
                      <div className="text-gray-500">
                        {r.source === 'pos' ? t('at the till') : t('recorded by a manager')}
                        {r.note ? ` · ${translateServerNote(r.note)}` : ''}
                      </div>
                      {!r.clockOut && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => closeNow(r.id)}>
                          {t('Clock out now')}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <DataCardActions>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(expanded === row.employeeId ? null : row.employeeId)}
                >
                  {expanded === row.employeeId ? t('Hide') : t('Details')}
                </Button>
              </DataCardActions>
            </>
          )}
        </DataCards>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Employee')}</Th>
              <Th className="text-right">{t('Shifts worked')}</Th>
              <Th className="text-right">{t('Hours')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {report.isLoading ? (
              <EmptyRow colSpan={4}>{t('Loading...')}</EmptyRow>
            ) : !report.data || report.data.employees.length === 0 ? (
              <EmptyRow colSpan={4}>{t('No attendance in this period.')}</EmptyRow>
            ) : (
              report.data.employees.map((row) => (
                <Fragment key={row.employeeId}>
                  <tr
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === row.employeeId ? null : row.employeeId)}
                  >
                    <Td className="font-medium">
                      {row.name}
                      {row.employeeCode && <span className="ml-1 text-xs text-gray-500">{row.employeeCode}</span>}
                      {row.open && <span className="ml-2 text-xs text-green-700">{t('clocked in')}</span>}
                    </Td>
                    <Td className="text-right tabular-nums">{row.shifts}</Td>
                    <Td className="text-right font-medium tabular-nums">{formatHours(row.hours)}</Td>
                    <Td className="text-right text-xs text-gray-500">{expanded === row.employeeId ? t('Hide') : t('Details')}</Td>
                  </tr>
                  {expanded === row.employeeId &&
                    row.records.map((r) => (
                      <tr key={r.id} className="bg-gray-50 text-xs">
                        <Td className="pl-8">
                          {formatDateTime(r.clockIn)} → {r.clockOut ? formatDateTime(r.clockOut) : t('still clocked in')}
                          <span className="ml-2 text-gray-500">
                            {r.source === 'pos' ? t('at the till') : t('recorded by a manager')}
                            {r.note ? ` · ${translateServerNote(r.note)}` : ''}
                          </span>
                        </Td>
                        <Td />
                        <Td className="text-right tabular-nums">{formatHours(r.hours)}</Td>
                        <Td className="text-right">
                          {!r.clockOut && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => closeNow(r.id)}>
                              {t('Clock out now')}
                            </Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                </Fragment>
              ))
            )}
          </TBody>
        </Table>
      )}
      {report.data && report.data.employees.length > 0 && (
        <div className="border-t p-3 text-right text-sm font-semibold">
          {t('Total: {hours}', { hours: formatHours(report.data.totalHours) })}
        </div>
      )}
    </Card>
  );
}

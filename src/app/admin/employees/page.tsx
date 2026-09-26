'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserX, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, Field, PageHeader } from '@/components/admin/page-header';
import { EmployeeFormDialog } from '@/components/admin/employees-form-dialog';
import { EmployeesAttendance } from '@/components/admin/employees-attendance';
import { getErrorMessage } from '@/lib/api/client';
import { Employee, EmployeeStatus, employeesApi } from '@/lib/api/employees';
import { branchesApi } from '@/lib/api/settings';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

type Tab = 'employees' | 'attendance';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('employees');
  const [status, setStatus] = useState<EmployeeStatus | ''>('active');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<Employee | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', 'list', status, branchId, search],
    queryFn: () =>
      employeesApi.list({
        status: status || undefined,
        branchId: branchId || undefined,
        search: search.trim() || undefined,
        limit: 100,
      }),
    placeholderData: (previous) => previous,
  });
  // Everyone, for the attendance filters
  const { data: all } = useQuery({
    queryKey: ['employees', 'list', 'all'],
    queryFn: () => employeesApi.list({ limit: 100 }),
    enabled: tab === 'attendance',
  });
  const rows = data?.data ?? [];
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  const reactivate = async (employee: Employee) => {
    setActionError(null);
    try {
      await employeesApi.reactivate(employee.id);
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not reactivate the employee'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Employees')}
        description={t('The people who work for the store, their branches and their hours. An employee may or may not have a user account.')}
        actions={
          tab === 'employees' && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t('Add employee')}
            </Button>
          )
        }
      />

      <div className="flex gap-2 border-b">
        {(['employees', 'attendance'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            {key === 'employees' ? t('Employees') : t('Attendance')}
          </button>
        ))}
      </div>

      {tab === 'attendance' ? (
        <EmployeesAttendance employees={all?.data ?? []} />
      ) : (
        <Card className="bg-white">
          <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by name, code or email')}
              className="md:w-64"
              aria-label={t('Search')}
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus | '')}
              className="md:w-40"
              aria-label={t('Status')}
            >
              <option value="">{t('All statuses')}</option>
              <option value="active">{t('Active')}</option>
              <option value="inactive">{t('Inactive')}</option>
            </Select>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="md:w-48" aria-label={t('Branch')}>
              <option value="">{t('All branches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>

          {(error || actionError) && (
            <div className="m-4">
              <ErrorMessage>{actionError ?? getErrorMessage(error, 'Could not load employees')}</ErrorMessage>
            </div>
          )}

          <Table>
            <THead>
              <tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Job title')}</Th>
                <Th>{t('Branches')}</Th>
                <Th>{t('User account')}</Th>
                <Th>{t('Status')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={6}>{t('No employees match.')}</EmptyRow>
              ) : (
                rows.map((e) => (
                  <tr key={e.id}>
                    <Td className="font-medium">
                      {e.name}
                      {e.employeeCode && <span className="block text-xs text-gray-500">{e.employeeCode}</span>}
                    </Td>
                    <Td>{e.jobTitle ?? '—'}</Td>
                    <Td className="text-sm">
                      {e.branches.length === 0
                        ? '—'
                        : e.branches.map((b) => (
                            <span key={b.branchId} className={cn('mr-2', b.isPrimary && 'font-medium')}>
                              {branchName(b.branchId)}
                              {b.isPrimary && <span className="text-xs text-gray-500"> ({t('primary')})</span>}
                            </span>
                          ))}
                    </Td>
                    <Td className="text-sm">{e.user ? e.user.email : <span className="text-gray-400">{t('No account')}</span>}</Td>
                    <Td>
                      <Badge variant={e.status === 'active' ? 'success' : 'default'}>{t(e.status)}</Badge>
                      {e.terminationDate && <span className="block text-xs text-gray-500">{e.terminationDate}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                        aria-label={t('Edit')}
                        title={t('Edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {e.status === 'active' ? (
                        <Button size="sm" variant="ghost" onClick={() => setDeactivating(e)} title={t('Deactivate')} aria-label={t('Deactivate')}>
                          <UserX className="h-4 w-4 text-red-600" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => reactivate(e)} title={t('Reactivate')} aria-label={t('Reactivate')}>
                          <UserCheck className="h-4 w-4 text-green-700" />
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
          {data?.meta && (
            <div className="border-t p-3 text-sm text-gray-600">
              {plural(data.meta.total, '{count} employee', '{count} employees')}
            </div>
          )}
        </Card>
      )}

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <DeactivateDialog employee={deactivating} onClose={() => setDeactivating(null)} />
    </div>
  );
}

function DeactivateDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [terminationDate, setTerminationDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setTerminationDate('');
    setReason('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!employee) return;
    setBusy(true);
    setError(null);
    try {
      await employeesApi.deactivate(employee.id, {
        terminationDate: terminationDate || undefined,
        reason: reason.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      close();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not deactivate the employee'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!employee} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Deactivate {name}', { name: employee?.name ?? '' })}</DialogTitle>
          <DialogDescription>
            {employee?.user
              ? t('Their user account ({email}) is suspended and signed out everywhere, and an open clock-in is ended.', {
                  email: employee.user.email,
                })
              : t('An open clock-in is ended. The employee stays in the history.')}
          </DialogDescription>
        </DialogHeader>
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={t('Last day')} htmlFor="termination-date">
          <Input id="termination-date" type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
        </Field>
        <Field label={t('Reason (optional)')} htmlFor="deactivate-reason">
          <Input id="deactivate-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {t('Deactivate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { memberName } from '@/components/admin/user-form-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { Employee, employeesApi } from '@/lib/api/employees';
import { branchesApi } from '@/lib/api/settings';
import { usersApi } from '@/lib/api/users';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
  employeeCode: string;
  hireDate: string;
  notes: string;
  userId: string;
  branchIds: string[];
  primaryBranchId: string;
}

function toForm(e: Employee | null): FormState {
  return {
    firstName: e?.firstName ?? '',
    lastName: e?.lastName ?? '',
    jobTitle: e?.jobTitle ?? '',
    phone: e?.phone ?? '',
    email: e?.email ?? '',
    employeeCode: e?.employeeCode ?? '',
    hireDate: e?.hireDate ?? '',
    notes: e?.notes ?? '',
    userId: e?.userId ?? '',
    branchIds: e?.branches.map((b) => b.branchId) ?? [],
    primaryBranchId: e?.branches.find((b) => b.isPrimary)?.branchId ?? '',
  };
}

/**
 * Add or edit an employee: details, the branches they work at (one primary) and
 * the login linked to them (optional).
 */
export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null: add a new employee
  employee: Employee | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open && <EmployeeForm key={employee?.id ?? 'new'} employee={employee} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeForm({ employee, onDone }: { employee: Employee | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canSeeUsers = hasPermission(user, 'users.manage');
  const [form, setForm] = useState<FormState>(() => toForm(employee));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const { data: members = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: canSeeUsers,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleBranch = (id: string, checked: boolean) =>
    setForm((f) => {
      const branchIds = checked ? [...f.branchIds, id] : f.branchIds.filter((b) => b !== id);
      const primaryBranchId = branchIds.includes(f.primaryBranchId) ? f.primaryBranchId : (branchIds[0] ?? '');
      return { ...f, branchIds, primaryBranchId };
    });

  const valid = form.firstName.trim() && form.lastName.trim();

  const save = async () => {
    setBusy(true);
    setError(null);
    const details = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      jobTitle: form.jobTitle.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      employeeCode: form.employeeCode.trim() || null,
      hireDate: form.hireDate || null,
      notes: form.notes.trim() || null,
      branches: form.branchIds.map((branchId) => ({ branchId, isPrimary: branchId === form.primaryBranchId })),
    };
    try {
      if (employee) {
        await employeesApi.update(employee.id, details);
        if (canSeeUsers && form.userId !== (employee.userId ?? '')) {
          if (form.userId) await employeesApi.linkUser(employee.id, form.userId);
          else await employeesApi.unlinkUser(employee.id);
        }
      } else {
        await employeesApi.create({
          ...details,
          jobTitle: details.jobTitle ?? undefined,
          phone: details.phone ?? undefined,
          email: details.email ?? undefined,
          employeeCode: details.employeeCode ?? undefined,
          hireDate: details.hireDate ?? undefined,
          notes: details.notes ?? undefined,
          userId: form.userId || undefined,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the employee'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{employee ? t('Edit employee') : t('Add employee')}</DialogTitle>
        <DialogDescription>
          {t('Employees are the people who work for the store. Link one to a user account when they sign in.')}
        </DialogDescription>
      </DialogHeader>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('First name')} htmlFor="emp-first">
          <Input id="emp-first" value={form.firstName} maxLength={100} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label={t('Last name')} htmlFor="emp-last">
          <Input id="emp-last" value={form.lastName} maxLength={100} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label={t('Job title')} htmlFor="emp-title">
          <Input id="emp-title" value={form.jobTitle} maxLength={100} onChange={(e) => set('jobTitle', e.target.value)} />
        </Field>
        <Field label={t('Employee code')} htmlFor="emp-code">
          <Input id="emp-code" value={form.employeeCode} maxLength={50} onChange={(e) => set('employeeCode', e.target.value)} />
        </Field>
        <Field label={t('Phone')} htmlFor="emp-phone">
          <Input id="emp-phone" value={form.phone} maxLength={50} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label={t('Email')} htmlFor="emp-email">
          <Input id="emp-email" type="email" value={form.email} maxLength={255} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label={t('Hire date')} htmlFor="emp-hire">
          <Input id="emp-hire" type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} />
        </Field>
        <Field
          label={t('User account')}
          htmlFor="emp-user"
          hint={canSeeUsers ? t('The login this employee signs in with (optional)') : t('Linking an account needs the Users permission')}
        >
          {canSeeUsers ? (
            <Select id="emp-user" value={form.userId} onChange={(e) => set('userId', e.target.value)}>
              <option value="">{t('No account')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberName(m)} · {m.email}
                </option>
              ))}
            </Select>
          ) : (
            <Input id="emp-user" value={employee?.user?.name ?? t('No account')} disabled />
          )}
        </Field>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{t('Branches')}</div>
        {branches.length === 0 ? (
          <p className="text-xs text-gray-500">{t('No branches yet.')}</p>
        ) : (
          <div className="grid gap-1 sm:grid-cols-2">
            {branches.map((b) => {
              const assigned = form.branchIds.includes(b.id);
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={assigned} onChange={(e) => toggleBranch(b.id, e.target.checked)} />
                    {b.name}
                  </label>
                  {assigned && (
                    <label className="flex items-center gap-1 text-xs text-gray-600">
                      <input
                        type="radio"
                        name="primary-branch"
                        checked={form.primaryBranchId === b.id}
                        onChange={() => set('primaryBranchId', b.id)}
                      />
                      {t('Primary')}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Field label={t('Notes (optional)')} htmlFor="emp-notes">
        <Textarea id="emp-notes" rows={2} maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={busy}>
          {t('Cancel')}
        </Button>
        <Button onClick={save} disabled={busy || !valid}>
          {busy ? t('Saving...') : t('Save')}
        </Button>
      </DialogFooter>
    </>
  );
}

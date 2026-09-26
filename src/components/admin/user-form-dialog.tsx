'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { Member, usersApi } from '@/lib/api/users';
import { hasAllBranches, useAuthStore } from '@/stores/auth-store';
import { rolesApi } from '@/lib/api/roles';
import { branchesApi } from '@/lib/api/settings';
import { t } from '@/i18n';
import { roleLabel } from '@/lib/server-texts';

export const memberName = (m: Pick<Member, 'firstName' | 'lastName' | 'email'>) =>
  [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;

const userSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  firstName: z.string().max(100),
  lastName: z.string().max(100),
  role: z.string().min(1, 'Choose a role'),
  // invited: only its invitee answers it (never sent)
  status: z.enum(['active', 'suspended', 'invited']),
  password: z.union([z.literal(''), z.string().min(8, 'At least 8 characters').max(128)]),
  // Branch access: every branch, or the listed ones
  allBranches: z.boolean(),
  branchIds: z.array(z.string()),
});

type UserFormData = z.infer<typeof userSchema>;

// A new member gets every branch, or the branches of a branch-limited admin
function toFormData(member: Member | null, myBranchIds: string[] | null): UserFormData {
  const branchIds = member ? member.branchIds : myBranchIds;
  return {
    allBranches: !branchIds,
    branchIds: branchIds ?? [],
    email: member?.email ?? '',
    firstName: member?.firstName ?? '',
    lastName: member?.lastName ?? '',
    role: member?.role ?? 'cashier',
    status: member?.status ?? 'active',
    password: '',
  };
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Member to edit; null to add a new one
  member: Member | null;
}

export function UserFormDialog({ open, onOpenChange, member }: UserFormDialogProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!member;
  // The backend rejects changing your own role or status
  const isSelf = !!member && member.id === currentUser?.id;
  // An existing account that has not accepted yet: admins cannot change its status
  const isInvited = member?.status === 'invited';
  const canGrantOwner = currentUser?.role === 'owner';
  // Only users with every branch can give every branch (the API refuses otherwise)
  const canGrantAllBranches = hasAllBranches(currentUser);
  const { data: allRoles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list, enabled: open });
  // Already limited to the branches the signed-in user has
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    enabled: open,
  });
  const myBranchIds = currentUser?.branchIds ?? null;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: toFormData(member, myBranchIds),
  });
  const isOwnerRole = useWatch({ control, name: 'role' }) === 'owner';
  const branchAccess = {
    all: useWatch({ control, name: 'allBranches' }),
    ids: useWatch({ control, name: 'branchIds' }),
  };
  const setBranchAccess = (all: boolean, ids = branchAccess.ids) => {
    setValue('allBranches', all);
    setValue('branchIds', ids);
  };

  useEffect(() => {
    if (open) {
      reset(toFormData(member, myBranchIds));
    }
  }, [open, member, reset, myBranchIds]);

  // What is sent: null = every branch; nothing for owners or yourself
  const branchIdsInput = (data: UserFormData): { branchIds?: string[] | null } => {
    if (isSelf || data.role === 'owner') return {};
    return { branchIds: data.allBranches ? null : data.branchIds };
  };
  const toggleBranch = (id: string, checked: boolean) =>
    setBranchAccess(
      false,
      checked ? [...new Set([...branchAccess.ids, id])] : branchAccess.ids.filter((b) => b !== id)
    );
  const visibleBranchIds = new Set(branches.map((b) => b.id));
  const employeeBranchIds = (member?.employeeBranchIds ?? []).filter((id) => visibleBranchIds.has(id));

  const save = useMutation({
    mutationFn: (data: UserFormData) => {
      if (member) {
        return usersApi.update(member.id, {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          ...(!isSelf && { role: data.role }),
          ...(!isSelf && !isInvited && data.status !== 'invited' && { status: data.status }),
          ...branchIdsInput(data),
        });
      }
      return usersApi.create({
        email: data.email,
        role: data.role,
        ...(data.firstName.trim() && { firstName: data.firstName.trim() }),
        ...(data.lastName.trim() && { lastName: data.lastName.trim() }),
        ...(data.password && { password: data.password }),
        ...branchIdsInput(data),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: UserFormData) => {
    setError(null);
    if (!isSelf && data.role !== 'owner' && !data.allBranches && data.branchIds.length === 0) {
      setError(t('Choose at least one branch'));
      return;
    }
    try {
      await save.mutateAsync(data);
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save user'));
    }
  };

  // Keep the owner option visible when editing an existing owner
  const roles = allRoles.filter(
    (role) => role.key !== 'owner' || canGrantOwner || member?.role === 'owner'
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit user') : t('Add user')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('Update {name}.', { name: memberName(member) })
              : t('Give a staff member access to this store.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit ? (
              <Field label={t('Email')} className="sm:col-span-2">
                <p className="text-sm text-gray-600">{member.email}</p>
              </Field>
            ) : (
              <Field label={t('Email')} htmlFor="email" error={errorText(errors.email?.message)} className="sm:col-span-2">
                <Input id="email" type="email" autoComplete="off" {...register('email')} autoFocus />
              </Field>
            )}

            <Field label={t('First name')} htmlFor="firstName" error={errorText(errors.firstName?.message)}>
              <Input id="firstName" {...register('firstName')} />
            </Field>
            <Field label={t('Last name')} htmlFor="lastName" error={errorText(errors.lastName?.message)}>
              <Input id="lastName" {...register('lastName')} />
            </Field>

            {isSelf ? (
              <p className="text-sm text-gray-500 sm:col-span-2">
                {t("You can't change your own role or status. Ask another owner or admin.")}
              </p>
            ) : (
              <>
                <Field label={t('Role')} htmlFor="role">
                  <Select id="role" {...register('role')}>
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {roleLabel(role.name)}
                      </option>
                    ))}
                  </Select>
                </Field>
                {isEdit && isInvited && (
                  <Field label={t('Status')}>
                    <p className="text-sm text-gray-600">
                      {t('Invited — waiting for acceptance. They get access once they accept the invitation after signing in.')}
                    </p>
                  </Field>
                )}
                {isEdit && !isInvited && (
                  <Field label={t('Status')} htmlFor="status">
                    <Select id="status" {...register('status')}>
                      <option value="active">{t('Active')}</option>
                      <option value="suspended">{t('Suspended (no access)')}</option>
                    </Select>
                  </Field>
                )}
              </>
            )}

            {!isSelf && (
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{t('Branch access')}</div>
                  {!isOwnerRole && employeeBranchIds.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBranchAccess(false, employeeBranchIds)}
                    >
                      {t('Use employee branches')}
                    </Button>
                  )}
                </div>
                {isOwnerRole ? (
                  <p className="text-xs text-gray-500">{t('Owners always have access to every branch.')}</p>
                ) : (
                  <>
                    {canGrantAllBranches && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="branch-access"
                            checked={branchAccess.all}
                            onChange={() => setBranchAccess(true)}
                          />
                          {t('All branches')}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="branch-access"
                            checked={!branchAccess.all}
                            onChange={() => setBranchAccess(false)}
                          />
                          {t('Only some branches')}
                        </label>
                      </div>
                    )}
                    {!branchAccess.all &&
                      (branches.length === 0 ? (
                        <p className="text-xs text-gray-500">{t('No branches yet.')}</p>
                      ) : (
                        <div className="grid gap-1 sm:grid-cols-2">
                          {branches.map((b) => (
                            <label key={b.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                              <input
                                type="checkbox"
                                checked={branchAccess.ids.includes(b.id)}
                                onChange={(e) => toggleBranch(b.id, e.target.checked)}
                              />
                              {b.name}
                            </label>
                          ))}
                        </div>
                      ))}
                    <p className="text-xs text-gray-500">
                      {t(
                        "They only see the sales, shifts, stock and reports of these branches. Customers and the catalog are shared by all branches."
                      )}
                    </p>
                  </>
                )}
              </div>
            )}

            {!isEdit && (
              <Field
                label={t('Password')}
                htmlFor="password"
                error={errorText(errors.password?.message)}
                hint={t('Only needed when this email has no account yet. If the person already has an account, they receive an invitation to accept after signing in, and this password is not used.')}
                className="sm:col-span-2"
              >
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : isEdit ? t('Save changes') : t('Add user')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}

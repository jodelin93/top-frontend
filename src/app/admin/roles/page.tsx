'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field, PageHeader } from '@/components/admin/page-header';
import { PermissionInfo, rolesApi, TenantRole } from '@/lib/api/roles';
import { permissionGroupLabel, permissionLabel, roleDescription, roleLabel } from '@/lib/server-texts';
import { getErrorMessage } from '@/lib/api/client';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = hasPermission(user, 'roles.manage');

  const { data: roles = [], error: rolesError } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const { data: catalog = [] } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: rolesApi.permissions,
    staleTime: Infinity,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0] ?? null;
  // Unsaved edits per role id
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>();
    catalog.forEach((p) => map.set(p.group, [...(map.get(p.group) ?? []), p]));
    return [...map.entries()];
  }, [catalog]);

  const isOwner = selected?.key === 'owner';
  const current = selected ? (drafts[selected.id] ?? selected.permissions) : [];
  const dirty = !!selected && !!drafts[selected.id];

  const toggle = (permission: string) => {
    if (!selected || isOwner || !canEdit) return;
    const next = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    setDrafts({ ...drafts, [selected.id]: next });
  };

  const toggleGroup = (items: PermissionInfo[], on: boolean) => {
    if (!selected || isOwner || !canEdit) return;
    const keys = items.map((p) => p.key);
    const next = on ? [...new Set([...current, ...keys])] : current.filter((p) => !keys.includes(p));
    setDrafts({ ...drafts, [selected.id]: next });
  };

  const save = useMutation({
    mutationFn: (role: TenantRole) => rolesApi.update(role.id, { permissions: drafts[role.id] }),
    onSuccess: (_, role) => {
      const rest = { ...drafts };
      delete rest[role.id];
      setDrafts(rest);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      // The signed-in user's own permissions may have changed
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save role')),
  });

  const remove = useMutation({
    mutationFn: (role: TenantRole) => rolesApi.remove(role.id),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not delete role')),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Roles & permissions')}
        description={t('Choose what each role is allowed to do. People get a role on the Users page. Changes apply at their next page load.')}
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t('New role')}
            </Button>
          )
        }
      />
      <ErrorMessage>{error ?? (rolesError ? getErrorMessage(rolesError, 'Could not load roles') : null)}</ErrorMessage>

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card className="h-fit bg-white p-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedId(role.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50',
                selected?.id === role.id && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
              )}
            >
              <span>
                <span className="font-medium">{roleLabel(role.name)}</span>
                {drafts[role.id] && <span className="text-amber-600"> •</span>}
                <span className="block text-xs text-gray-500">
                  {plural(role.memberCount, '{count} person', '{count} people')}
                </span>
              </span>
              {role.isSystem && <Badge>{t('Built-in')}</Badge>}
            </button>
          ))}
        </Card>

        {selected && (
          <Card className="bg-white p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{roleLabel(selected.name)}</h2>
                <p className="text-sm text-gray-500">{selected.description ? roleDescription(selected.description) : t('Key: {key}', { key: selected.key })}</p>
              </div>
              {canEdit && !isOwner && (
                <div className="flex gap-2">
                  {!selected.isSystem && (
                    <Button
                      variant="outline"
                      className="text-red-600"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(t('Delete the role "{name}"?', { name: roleLabel(selected.name) }))) remove.mutate(selected);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('Delete')}
                    </Button>
                  )}
                  {dirty && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const rest = { ...drafts };
                        delete rest[selected.id];
                        setDrafts(rest);
                      }}
                    >
                      {t('Discard')}
                    </Button>
                  )}
                  <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(selected)}>
                    <Save className="h-4 w-4" />
                    {save.isPending ? t('Saving...') : t('Save')}
                  </Button>
                </div>
              )}
            </div>

            {isOwner && (
              <p className="mb-4 flex items-center gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                <Lock className="h-4 w-4" />
                {t("Owners always have every permission, so this role can't be changed.")}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {groups.map(([group, items]) => {
                const allOn = items.every((p) => current.includes(p.key));
                return (
                  <div key={group} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{permissionGroupLabel(group)}</h3>
                      {canEdit && !isOwner && (
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => toggleGroup(items, !allOn)}>
                          {allOn ? t('Clear all') : t('Select all')}
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {items.map((permission) => (
                        <label key={permission.key} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4"
                            checked={current.includes(permission.key)}
                            disabled={!canEdit || isOwner}
                            onChange={() => toggle(permission.key)}
                          />
                          <span>
                            {permissionLabel(permission.key, permission.label)}
                            <span className="block font-mono text-xs text-gray-400">{permission.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <NewRoleDialog
        open={creating}
        onOpenChange={setCreating}
        roles={roles}
        onCreated={(role) => {
          queryClient.invalidateQueries({ queryKey: ['roles'] });
          setSelectedId(role.id);
        }}
      />
    </div>
  );
}

function NewRoleDialog({
  open,
  onOpenChange,
  roles,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: TenantRole[];
  onCreated: (role: TenantRole) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState('cashier');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // "Shift lead" -> "shift-lead"
  const key = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, 'r-$1')
    .slice(0, 50);

  const close = () => {
    setName('');
    setDescription('');
    setError(null);
    onOpenChange(false);
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const role = await rolesApi.create({
        key,
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: roles.find((r) => r.key === copyFrom)?.permissions ?? [],
      });
      onCreated(role);
      close();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create role'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('New role')}</DialogTitle>
          <DialogDescription>{t("Start from an existing role's permissions, then adjust them.")}</DialogDescription>
        </DialogHeader>
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={t('Name')} htmlFor="role-name" hint={key ? t('Key: {key}', { key }) : undefined}>
          <Input id="role-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Shift lead')} />
        </Field>
        <Field label={t('Description')} htmlFor="role-description">
          <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label={t('Copy permissions from')} htmlFor="role-copy">
          <Select id="role-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            {roles
              .filter((r) => r.key !== 'owner')
              .map((r) => (
                <option key={r.id} value={r.key}>
                  {roleLabel(r.name)}
                </option>
              ))}
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('Cancel')}
          </Button>
          <Button onClick={create} disabled={busy || key.length < 2}>
            {busy ? t('Creating...') : t('Create role')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

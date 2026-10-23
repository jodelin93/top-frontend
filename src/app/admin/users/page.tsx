'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, LogOut, MailCheck, Pencil, Plus, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { memberName, UserFormDialog } from '@/components/admin/user-form-dialog';
import { UserPasswordDialog } from '@/components/admin/user-password-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { Member, usersApi } from '@/lib/api/users';
import { sessionsApi } from '@/lib/api/sessions';
import { branchesApi } from '@/lib/api/settings';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';
import { currentLang, t } from '@/i18n';
import { roleLabel } from '@/lib/server-texts';

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [resetting, setResetting] = useState<Member | null>(null);
  const smallScreen = useSmallScreen();

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  // "All branches", else the names (branches outside yours are not listed by the API)
  const branchAccess = (member: Member) =>
    member.branchIds
      ? member.branchIds.map((id) => branchNames.get(id) ?? t('Other branch')).join(', ') || t('No branch')
      : t('All branches');

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditing(member);
    setDialogOpen(true);
  };

  // Only owners can change or reset another owner
  const canManage = (member: Member) => member.role !== 'owner' || currentUser?.role === 'owner';

  // A user is signed in on one device at a time: sign them out of it (lost device,
  // browser closed without signing out) so they can sign in elsewhere
  const [notice, setNotice] = useState<string | null>(null);
  const disconnect = useMutation({
    mutationFn: (member: Member) => sessionsApi.revokeMember(member.id),
    onSuccess: ({ revoked }, member) =>
      setNotice(
        revoked > 0
          ? t('{name} is disconnected and can sign in again on any device.', { name: memberName(member) })
          : t('{name} was not signed in.', { name: memberName(member) })
      ),
  });
  const askDisconnect = (member: Member) => {
    setNotice(null);
    if (window.confirm(t('Disconnect {name} from every device? Unsaved work on that device is lost.', { name: memberName(member) }))) {
      disconnect.mutate(member);
    }
  };
  // Someone added who has not chosen their password yet: the e-mailed link again
  const resend = useMutation({
    mutationFn: (member: Member) => usersApi.resendSetupLink(member.id, currentLang()),
    onSuccess: (_, member) => setNotice(t('A new link to choose a password was sent to {email}.', { email: member.email })),
    onError: (err) => setNotice(getErrorMessage(err)),
  });
  // Password action: resend the link (not confirmed yet) or reset it
  const passwordButton = (member: Member) =>
    member.passwordSetupPending ? (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          setNotice(null);
          resend.mutate(member);
        }}
        disabled={resend.isPending}
        title={t('Send the link to choose a password again')}
        aria-label={t('Send the link to choose a password again to {name}', { name: member.email })}
        data-testid="resend-setup-link"
      >
        <Send className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setResetting(member)}
        aria-label={t('Reset password for {name}', { name: member.email })}
      >
        <KeyRound className="h-4 w-4" />
      </Button>
    );
  const statusBadge = (member: Member) =>
    member.status === 'invited' ? (
      <Badge variant="warning">{t('Invited — waiting for acceptance')}</Badge>
    ) : member.passwordSetupPending ? (
      <Badge variant="warning" title={t('The link to choose a password was e-mailed; it confirms the address.')}>
        <MailCheck className="mr-1 inline h-3 w-3" />
        {t('Waiting for the password (e-mail not confirmed)')}
      </Badge>
    ) : (
      <Badge variant={statusVariant(member.status)}>{t(member.status)}</Badge>
    );
  const disconnectButton = (member: Member) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => askDisconnect(member)}
      disabled={disconnect.isPending}
      title={t('Disconnect {name}', { name: member.email })}
      aria-label={t('Disconnect {name}', { name: member.email })}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Users')}
        description={t("Staff accounts and their access to this store. Use the pencil on a row to change someone's role; edit what each role can do under Roles & permissions.")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('Add user')}
          </Button>
        }
      />

      {notice && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {disconnect.error && <ErrorMessage>{getErrorMessage(disconnect.error, 'Could not disconnect this user')}</ErrorMessage>}

      <Card className="bg-white">
        {error && (
          <div className="m-4">
            <ErrorMessage>{getErrorMessage(error, 'Could not load users')}</ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per user instead of a table that scrolls sideways
          <DataCards
            items={members}
            getKey={(member) => member.id}
            loading={isLoading}
            loadingText={t('Loading users...')}
            emptyText={t('No users yet.')}
          >
            {(member) => {
              const isSelf = member.id === currentUser?.id;
              return (
                <>
                  <DataCardHeader
                    title={
                      <>
                        {memberName(member)}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">{t('(you)')}</span>}
                      </>
                    }
                    subtitle={member.email}
                    badge={
                      <>
                        <Badge variant={member.role === 'owner' ? 'info' : 'default'}>
                          {roleLabel(member.roleName)}
                        </Badge>
                        {statusBadge(member)}
                      </>
                    }
                  />
                  <DataCardFields>
                    <DataCardField label={t('Branches')}>{branchAccess(member)}</DataCardField>
                    <DataCardField label={t('MFA')}>
                      {member.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <ShieldCheck className="h-4 w-4" />
                          {t('On')}
                        </span>
                      ) : (
                        <span className="text-gray-400">{t('Off')}</span>
                      )}
                    </DataCardField>
                    <DataCardField label={t('Last login')} full>
                      {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : t('Never')}
                    </DataCardField>
                  </DataCardFields>
                  {canManage(member) && (
                    <DataCardActions>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(member)}
                        aria-label={t('Edit {name}', { name: member.email })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isSelf ? (
                        // One's own password is changed with the current one, from the account page
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link
                            href="/account/security"
                            title={t('Change your own password from your account settings')}
                            aria-label={t('Change your own password from your account settings')}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <>
                          {passwordButton(member)}
                          {disconnectButton(member)}
                        </>
                      )}
                    </DataCardActions>
                  )}
                </>
              );
            }}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Name')}</Th>
              <Th>{t('Email')}</Th>
              <Th>{t('Role')}</Th>
              <Th>{t('Branches')}</Th>
              <Th>{t('Status')}</Th>
              <Th>{t('MFA')}</Th>
              <Th>{t('Last login')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={8}>{t('Loading users...')}</EmptyRow>
            ) : members.length === 0 ? (
              <EmptyRow colSpan={8}>{t('No users yet.')}</EmptyRow>
            ) : (
              members.map((member) => {
                const isSelf = member.id === currentUser?.id;
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <Td className="font-medium">
                      {memberName(member)}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">{t('(you)')}</span>}
                    </Td>
                    <Td>{member.email}</Td>
                    <Td>
                      <Badge variant={member.role === 'owner' ? 'info' : 'default'}>
                        {roleLabel(member.roleName)}
                      </Badge>
                    </Td>
                    <Td className="text-sm text-gray-600">{branchAccess(member)}</Td>
                    <Td>
                      {statusBadge(member)}
                    </Td>
                    <Td>
                      {member.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <ShieldCheck className="h-4 w-4" />
                          {t('On')}
                        </span>
                      ) : (
                        <span className="text-gray-400">{t('Off')}</span>
                      )}
                    </Td>
                    <Td>{member.lastLoginAt ? formatDateTime(member.lastLoginAt) : t('Never')}</Td>
                    <Td className="whitespace-nowrap">
                      {canManage(member) && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(member)}
                            aria-label={t('Edit {name}', { name: member.email })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isSelf ? (
                            // One's own password is changed with the current one, from the account page
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link
                                href="/account/security"
                                title={t('Change your own password from your account settings')}
                                aria-label={t('Change your own password from your account settings')}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <>
                              {passwordButton(member)}
                              {disconnectButton(member)}
                            </>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
        )}
      </Card>

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} member={editing} />
      <UserPasswordDialog member={resetting} onClose={() => setResetting(null)} />

    </div>
  );
}

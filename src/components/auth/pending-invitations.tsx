'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/admin/page-header';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { t } from '@/i18n';
import { roleLabel } from '@/lib/server-texts';

export const INVITATIONS_QUERY_KEY = ['auth', 'invitations'] as const;

/**
 * Stores that added the signed-in account and wait for it to accept. Accepting adds the
 * store to the store switcher; declining removes the invitation. Renders nothing when
 * there is no pending invitation.
 */
export function PendingInvitations({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { data: invitations = [] } = useQuery({
    queryKey: INVITATIONS_QUERY_KEY,
    queryFn: authApi.invitations,
    staleTime: 60_000,
  });
  const answer = useMutation({
    mutationFn: ({ tenantId, accept }: { tenantId: string; accept: boolean }) =>
      authApi.answerInvitation(tenantId, accept ? 'accept' : 'decline'),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY }),
        // An accepted store now appears in the store switcher
        queryClient.invalidateQueries({ queryKey: ['auth', 'stores'] }),
      ]);
    },
  });

  if (invitations.length === 0) return null;

  return (
    <div
      role="region"
      aria-label={t('Store invitations')}
      className={`space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <MailOpen className="h-5 w-5 text-blue-600" />
        {t('Store invitations')}
      </div>
      <p>{t('These stores added your account. Accept to work in them; they then appear in your list of stores.')}</p>
      <ErrorMessage>{answer.error && getErrorMessage(answer.error, 'Could not answer the invitation')}</ErrorMessage>
      <ul className="divide-y divide-blue-100 rounded-md border border-blue-100 bg-white">
        {invitations.map((invitation) => (
          <li key={invitation.tenantId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <div>
              <div className="font-medium">{invitation.name}</div>
              <div className="text-xs text-gray-500">{t('Role: {role}', { role: roleLabel(invitation.roleName) })}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={answer.isPending}
                onClick={() => answer.mutate({ tenantId: invitation.tenantId, accept: false })}
                aria-label={t('Decline the invitation from {store}', { store: invitation.name })}
              >
                {t('Decline')}
              </Button>
              <Button
                size="sm"
                disabled={answer.isPending}
                onClick={() => answer.mutate({ tenantId: invitation.tenantId, accept: true })}
                aria-label={t('Accept the invitation from {store}', { store: invitation.name })}
              >
                {t('Accept')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

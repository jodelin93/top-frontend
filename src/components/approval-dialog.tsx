'use client';

import { useCallback, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { APPROVAL_HEADER, approvablePermission, approvalAction, approvalsApi } from '@/lib/api/approvals';
import { rolesApi } from '@/lib/api/roles';
import { getErrorMessage } from '@/lib/api/client';
import { t } from '@/i18n';
import { useHelpContext } from '@/help/store';
import { permissionLabel } from '@/lib/server-texts';

type Headers = Record<string, string>;

/**
 * Manager override. Wrap an API call with `withApproval`: if the server answers that
 * the user lacks a permission a manager can approve, a dialog asks for a manager's
 * credentials and the call is retried with the approval token. The token is single
 * use and only valid for the action the 403 named (its `action`, e.g. "POST /sales").
 *
 *   const { withApproval, approvalDialog } = useApproval();
 *   await withApproval((headers) => salesApi.void(id, reason, headers));
 *   ...
 *   return <>{...}{approvalDialog}</>;
 */
export function useApproval() {
  const [permission, setPermission] = useState<string | null>(null);
  const [action, setAction] = useState<string | undefined>(undefined);
  const resolver = useRef<((token: string | null) => void) | null>(null);

  const requestToken = useCallback(
    (perm: string, forAction?: string) =>
      new Promise<string | null>((resolve) => {
        resolver.current = resolve;
        setAction(forAction);
        setPermission(perm);
      }),
    []
  );

  const finish = (token: string | null) => {
    resolver.current?.(token);
    resolver.current = null;
    setPermission(null);
    setAction(undefined);
  };

  const withApproval = useCallback(
    async <T,>(call: (headers?: Headers) => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        const perm = approvablePermission(error);
        if (!perm) throw error;
        const token = await requestToken(perm, approvalAction(error));
        if (!token) throw error;
        return call({ [APPROVAL_HEADER]: token });
      }
    },
    [requestToken]
  );

  const approvalDialog = (
    <ApprovalDialog
      permission={permission}
      action={action}
      onApproved={(token) => finish(token)}
      onCancel={() => finish(null)}
    />
  );

  return { withApproval, approvalDialog };
}

function ApprovalDialog({
  permission,
  action,
  onApproved,
  onCancel,
}: {
  permission: string | null;
  // The request being approved ("METHOD /path"), binding the token to it
  action?: string;
  onApproved: (token: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Human-readable name of the permission being approved
  const { data: catalog = [] } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: rolesApi.permissions,
    enabled: !!permission,
    staleTime: Infinity,
  });
  useHelpContext(permission ? 'approvals' : null);
  const label = permission ? permissionLabel(permission, catalog.find((p) => p.key === permission)?.label) : '';

  const reset = () => {
    setEmail('');
    setPassword('');
    setMfaCode('');
    setError(null);
  };

  const submit = async () => {
    if (!permission) return;
    // An approval is bound to one request: without it the server refuses, so don't send
    if (!action) {
      setError(t('This action cannot be approved here. Ask a manager to do it.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await approvalsApi.request({
        permission,
        approverEmail: email.trim(),
        password,
        mfaCode: mfaCode.trim() || undefined,
        action,
      });
      reset();
      onApproved(result.approvalToken);
    } catch (err) {
      setError(getErrorMessage(err, 'Approval failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!permission}
      onOpenChange={(open) => {
        if (!open && !busy) {
          reset();
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            {t('Manager approval needed')}
          </DialogTitle>
          <DialogDescription>
            {t("You don't have permission to:")} <strong>{label}</strong>.{' '}
            {t('A manager can approve this once by entering their own credentials.')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('Manager email')} htmlFor="approver-email">
            <Input id="approver-email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </Field>
          <Field label={t('Password')} htmlFor="approver-password">
            <Input id="approver-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
          </Field>
          <Field label={t('Two-factor code')} htmlFor="approver-mfa" hint={t('Only if the manager has two-factor authentication on')}>
            <Input
              id="approver-mfa"
              inputMode="numeric"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="off"
            />
          </Field>
          <div className={cn('flex justify-end gap-2', dialogStickyFooter)}>
            <Button type="button" variant="outline" onClick={() => { reset(); onCancel(); }} disabled={busy}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={busy || !email || !password}>
              {busy ? t('Checking...') : t('Approve')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

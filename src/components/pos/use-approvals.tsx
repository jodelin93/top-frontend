'use client';

import { useCallback } from 'react';
import { useApproval } from '@/components/approval-dialog';
import { APPROVAL_HEADER, approvablePermission } from '@/lib/api/approvals';
import type { ApprovalHeaders } from '@/lib/api/sales';

/**
 * Like useApproval(), but a cart can need more than one manager approval
 * (e.g. a price override and a discount above the limit). Each 403 that a manager
 * can approve opens the approval dialog; the collected tokens are sent together
 * (comma-separated X-Approval-Token). Pass the tokens of an earlier call to reuse
 * them (quote → checkout); the final list is handed to onTokens.
 */
export function useApprovals() {
  const { withApproval, approvalDialog } = useApproval();

  const run = useCallback(
    async <T,>(
      call: (headers?: ApprovalHeaders) => Promise<T>,
      options: { tokens?: string[]; onTokens?: (tokens: string[]) => void } = {}
    ): Promise<T> => {
      const tokens = [...(options.tokens ?? [])];
      const headers = () => (tokens.length ? { [APPROVAL_HEADER]: tokens.join(',') } : undefined);
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const result = await call(headers());
          options.onTokens?.(tokens);
          return result;
        } catch (error) {
          if (!approvablePermission(error)) throw error;
          // Reuse the approval dialog: the first call fails, the retry returns the token
          const token = await withApproval<string>(async (approved) => {
            if (!approved) throw error;
            return approved[APPROVAL_HEADER];
          });
          tokens.push(token);
        }
      }
      return call(headers());
    },
    [withApproval]
  );

  return { run, approvalDialog };
}

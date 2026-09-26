import { AxiosError } from 'axios';
import apiClient from './client';

export const APPROVAL_HEADER = 'X-Approval-Token';

export interface ApprovalResult {
  approvalToken: string;
  expiresIn: number;
  approver: { id: string; name: string };
}

export const approvalsApi = {
  // A manager authorises one action for the signed-in user
  request: async (input: {
    permission: string;
    approverEmail: string;
    password: string;
    mfaCode?: string;
    // The request it is for ("METHOD /path", the `action` of the 403): single use, that action only
    action: string;
  }): Promise<ApprovalResult> => {
    const { data } = await apiClient.post('/approvals', input);
    return data;
  },
};

// The action ("METHOD /path") an approvable 403 is for, to bind the approval to it
export function approvalAction(error: unknown): string | undefined {
  const data = (error as AxiosError<{ action?: string }>)?.response?.data;
  return typeof data?.action === 'string' ? data.action : undefined;
}

// The permission a 403 says is missing, when a manager's approval can unlock it
export function approvablePermission(error: unknown): string | null {
  const data = (error as AxiosError<{ approvable?: boolean; missingPermissions?: string[] }>)?.response?.data;
  if ((error as AxiosError)?.response?.status === 403 && data?.approvable && data.missingPermissions?.length === 1) {
    return data.missingPermissions[0];
  }
  return null;
}

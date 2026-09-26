import apiClient from './client';

export interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  // Role key (built-in or custom) and its display name
  role: string;
  roleName: string;
  // invited: an existing account was added and has not accepted yet (no access until then)
  status: 'active' | 'suspended' | 'invited';
  joinedAt: string;
  // Branches the member works in: null = every branch (owners always)
  branchIds: string[] | null;
  // Branches of the employee record linked to this user, to prefill branchIds
  employeeBranchIds: string[] | null;
}

export const usersApi = {
  list: async (): Promise<Member[]> => {
    const { data } = await apiClient.get('/users');
    return data;
  },
  create: async (input: {
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    role: string;
    branchIds?: string[] | null;
  }): Promise<Member> => {
    const { data } = await apiClient.post('/users', input);
    return data;
  },
  update: async (
    userId: string,
    input: {
      firstName?: string;
      lastName?: string;
      role?: string;
      // An invitation is only answered by its invitee
      status?: Exclude<Member['status'], 'invited'>;
      // null = every branch
      branchIds?: string[] | null;
    },
  ): Promise<Member> => {
    const { data } = await apiClient.patch(`/users/${userId}`, input);
    return data;
  },
  resetPassword: async (userId: string, password: string): Promise<void> => {
    await apiClient.post(`/users/${userId}/password`, { password });
  },
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';
import { clearLocalSessionData } from '@/lib/session-cleanup';
import { adminNav } from '@/lib/admin-nav';

// Built-in role keys; stores can also define custom roles (any string key)
export type Role = 'owner' | 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  // Key of the member's role, e.g. 'cashier' or a custom 'shift-lead'
  role: string | null;
  roleName?: string | null;
  permissions?: string[];
  // Branches the user works in: null (or absent) = every branch
  branchIds?: string[] | null;
  tenantId: string | null;
  tenantName?: string | null;
  mfaEnabled: boolean;
  // The store requires two-factor for this role and it isn't set up yet
  mfaSetupRequired?: boolean;
}

// Does the user work in every branch? (owners always; others unless limited)
export const hasAllBranches = (user: User | null) => !user?.branchIds;

// Permission keys match top-backend/src/auth/permissions.ts
export const hasPermission = (user: User | null, ...permissions: string[]) =>
  permissions.every((p) => user?.permissions?.includes(p));

export const hasAnyPermission = (user: User | null, ...permissions: string[]) =>
  permissions.some((p) => user?.permissions?.includes(p));

// Anything that makes the admin area useful to this user
export const ADMIN_AREA_PERMISSIONS = [
  'reports.view',
  'catalog.manage',
  'pricing.manage',
  'discounts.manage',
  'inventory.receive',
  'inventory.adjust',
  'customers.manage',
  'users.manage',
  'roles.manage',
  'settings.manage',
  'audit.view',
  'platform.operate',
  'purchasing.manage',
  'shifts.manage',
  'expenses.approve',
];

// Someone who can't sell at the till (e.g. an accountant) may use any admin
// page their permissions open, so they are never left without a place to work
export const canUseAdmin = (user: User | null) =>
  hasAnyPermission(user, ...ADMIN_AREA_PERMISSIONS) ||
  (!hasPermission(user, 'pos.sell') &&
    adminNav.some(({ items }) => items.some((item) => hasAnyPermission(user, ...item.permissions))));

interface AuthState {
  user: User | null;
  accessToken: string | null;
  tempToken: string | null;
  isAuthenticated: boolean;
  requiresMfa: boolean;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, tempToken?: string) => void;
  setRequiresMfa: (requires: boolean) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tempToken: null,
      isAuthenticated: false,
      requiresMfa: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, tempToken) => {
        // Store in localStorage for API client. Clear whichever token is not being set,
        // so a stale token from an earlier session is never sent instead.
        if (accessToken) {
          localStorage.setItem('access_token', accessToken);
        } else {
          localStorage.removeItem('access_token');
        }
        if (tempToken) {
          localStorage.setItem('temp_token', tempToken);
        } else {
          localStorage.removeItem('temp_token');
        }
        set({ accessToken, tempToken: tempToken ?? null });
      },

      setRequiresMfa: (requires) => set({ requiresMfa: requires }),

      logout: () => {
        // End the session on the server too (best effort; works offline as a local sign-out)
        const token = localStorage.getItem('access_token');
        if (token) void authApi.logout(token).catch(() => undefined);
        localStorage.removeItem('access_token');
        localStorage.removeItem('temp_token');
        // The next person on this till must not see the previous user's cart, staff
        // list or cached pages (the offline sales queue is kept)
        void clearLocalSessionData();
        set({
          user: null,
          accessToken: null,
          tempToken: null,
          isAuthenticated: false,
          requiresMfa: false,
        });
      },

      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('temp_token');
        set({
          user: null,
          accessToken: null,
          tempToken: null,
          isAuthenticated: false,
          requiresMfa: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

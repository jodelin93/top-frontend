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

/*
 * The session itself is an HttpOnly cookie set by the API (pos_session; the
 * second-factor step uses pos_mfa): JavaScript never sees a token. This store
 * only keeps the non-secret profile, so the UI knows who is signed in.
 */

// Keys where earlier versions kept the tokens: removed on load (migration)
const LEGACY_TOKEN_KEYS = ['access_token', 'temp_token'];
// Set when sign-out could not reach the server (offline): retried once back online,
// so the session cookie left in this browser is revoked
const LOGOUT_PENDING_KEY = 'pos_logout_pending';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function removeLegacyTokens() {
  const store = storage();
  if (!store) return;
  try {
    LEGACY_TOKEN_KEYS.forEach((key) => store.removeItem(key));
  } catch {
    // Storage unavailable
  }
}

const setLogoutPending = (pending: boolean) => {
  try {
    if (pending) storage()?.setItem(LOGOUT_PENDING_KEY, '1');
    else storage()?.removeItem(LOGOUT_PENDING_KEY);
  } catch {
    // Storage unavailable
  }
};

// End the server session (revokes it and clears the cookie). A network failure leaves
// it pending, retried when the till is back online; a 401 means it already ended.
async function endServerSession() {
  try {
    await authApi.logout();
    setLogoutPending(false);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    setLogoutPending(status === undefined);
  }
}

/** Retry a sign-out made offline, unless someone has signed in since. */
export function retryPendingLogout(isAuthenticated = useAuthStore.getState().isAuthenticated) {
  try {
    if (!storage()?.getItem(LOGOUT_PENDING_KEY)) return;
  } catch {
    return;
  }
  if (isAuthenticated) {
    setLogoutPending(false);
    return;
  }
  void endServerSession();
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  requiresMfa: boolean;

  // Actions
  setUser: (user: User) => void;
  setRequiresMfa: (requires: boolean) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      requiresMfa: false,

      // After sign-in: the server has just set the session cookie
      setUser: (user) => {
        setLogoutPending(false);
        set({ user, isAuthenticated: true });
      },

      setRequiresMfa: (requires) => set({ requiresMfa: requires }),

      logout: () => {
        // End the session on the server too: revokes it and clears the HttpOnly
        // cookie (offline: a local sign-out now, the server one once back online)
        void endServerSession();
        removeLegacyTokens();
        // The next person on this till must not see the previous user's cart, staff
        // list or cached pages (the offline sales queue is kept)
        void clearLocalSessionData();
        set({
          user: null,
          isAuthenticated: false,
          requiresMfa: false,
        });
      },

      clearAuth: () => {
        removeLegacyTokens();
        set({
          user: null,
          isAuthenticated: false,
          requiresMfa: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      // Profile only (never a token)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Runs while the store is being created: the saved state is passed in
      onRehydrateStorage: () => (state) => {
        removeLegacyTokens();
        const isAuthenticated = !!state?.isAuthenticated;
        setTimeout(() => retryPendingLogout(isAuthenticated), 0);
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => retryPendingLogout());
}

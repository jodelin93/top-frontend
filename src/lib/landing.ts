import { adminNav } from '@/lib/admin-nav';
import { canUseAdmin, hasAnyPermission, hasPermission, type User } from '@/stores/auth-store';

// Selling at the till (see top-backend/src/auth/permissions.ts)
export const POS_SELL_PERMISSION = 'pos.sell';

export const canSell = (user: User | null) => hasPermission(user, POS_SELL_PERMISSION);

// Everyday pages a role starts on, in order, before the rest of the menu (an
// inventory clerk starts on the stock, not on the review queue)
const PREFERRED_START = [
  '/admin/dashboard',
  '/admin/inventory',
  '/admin/sales',
  '/admin/purchasing',
];

/** The admin page the user starts on (the dashboard when allowed), else null */
export function firstAdminHref(user: User | null): string | null {
  if (!canUseAdmin(user)) return null;
  const allowed = adminNav
    .flatMap((section) => section.items)
    .filter((item) => hasAnyPermission(user, ...item.permissions));
  const preferred = PREFERRED_START.find((href) =>
    allowed.some((item) => item.href === href)
  );
  return preferred ?? allowed[0]?.href ?? null;
}

/**
 * Where a signed-in user starts: the till for those who sell, else the first
 * admin page they may open. Users with neither get '/pos', which explains that
 * their role gives them no access (with a sign-out button).
 */
export function homePath(user: User | null): string {
  if (canSell(user)) return '/pos';
  return firstAdminHref(user) ?? '/pos';
}

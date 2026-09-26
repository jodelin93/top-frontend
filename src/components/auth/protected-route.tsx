'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// True once the saved login has been read from localStorage (false during SSR)
function useAuthHydrated() {
  return useSyncExternalStore(
    (callback) => useAuthStore.persist.onFinishHydration(callback),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const { isAuthenticated, requiresMfa, user, setUser } = useAuthStore();

  useEffect(() => {
    // Wait for the saved login: redirecting earlier sends signed-in users to the
    // login page on every full page reload
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else if (requiresMfa) {
      router.push('/auth/mfa-verify');
    }
  }, [hydrated, isAuthenticated, requiresMfa, router]);

  // Refresh the saved profile so role and permission changes apply without signing in again
  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated && !requiresMfa,
    staleTime: 60_000,
    retry: false,
  });
  useEffect(() => {
    if (!profile) return;
    const changed =
      profile.role !== user?.role ||
      profile.tenantId !== user?.tenantId ||
      (profile.permissions ?? []).join() !== (user?.permissions ?? []).join();
    if (changed) setUser({ ...user, ...profile });
  }, [profile, user, setUser]);

  if (!hydrated || !isAuthenticated || requiresMfa) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}

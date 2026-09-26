'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminNav } from '@/lib/admin-nav';
import { hasAnyPermission, useAuthStore } from '@/stores/auth-store';

// Send the user to the first admin page they are allowed to open
export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const first = adminNav
      .flatMap((section) => section.items)
      .find((item) => hasAnyPermission(user, ...item.permissions));
    router.replace(first?.href ?? '/pos');
  }, [user, router]);

  return null;
}

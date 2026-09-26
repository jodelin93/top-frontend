'use client';

import { useQuery } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { posApi, StaffMember } from '@/lib/api/sales';
import { isNetworkError } from '@/lib/pos/sync';
import { t } from '@/i18n';
import { LOCAL_FALLBACK_QUERY } from '@/hooks/use-pos-data';
import { STAFF_CACHE_KEY } from '@/lib/session-cleanup';

// Last staff list, so the picker still works while the till is offline
// (cleared on sign-out: lib/session-cleanup.ts)

function cachedStaff(): StaffMember[] {
  try {
    return JSON.parse(localStorage.getItem(STAFF_CACHE_KEY) ?? '[]') as StaffMember[];
  } catch {
    return [];
  }
}

/** Staff a sale can be credited to (GET /pos/staff), cached for offline use */
export function useStaff() {
  return useQuery({
    queryKey: ['pos', 'staff'],
    // Offline: the cached staff list
    ...LOCAL_FALLBACK_QUERY,
    queryFn: async () => {
      try {
        const staff = await posApi.staff();
        try {
          localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(staff));
        } catch {
          // Storage full or blocked: the picker just won't work offline
        }
        return staff;
      } catch (error) {
        if (isNetworkError(error)) return cachedStaff();
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Who gets the credit for the sale (commission, reports). Separate from the
 * cashier ringing it up; optional.
 */
export function SalespersonSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (salespersonId: string | null) => void;
}) {
  const { data: staff = [] } = useStaff();
  if (staff.length === 0 && !value) return null;
  return (
    <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
      <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{t('Salesperson')}</span>
      <Select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10"
        aria-label={t('Salesperson')}
      >
        <option value="">{t('No salesperson')}</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {t('Salesperson: {name}', { name: member.name })}
          </option>
        ))}
      </Select>
    </label>
  );
}

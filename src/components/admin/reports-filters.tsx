'use client';

import { useQuery } from '@tanstack/react-query';
import { CloudOff, Clock } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { branchesApi } from '@/lib/api/settings';
import type { DataFreshness } from '@/lib/api/reports';
import { formatDateTime } from '@/lib/format';
import { t } from '@/i18n';

/** Branches for report filters (any staff member may read them) */
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Branch filter of reports and the dashboard: '' = every branch. Hidden when
 * the store has a single branch.
 */
export function BranchFilter({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
}) {
  const { data: branches = [] } = useBranches();
  if (branches.length < 2) return null;
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="sm:w-48"
      aria-label={t('Branch')}
      title={disabled ? t('This report covers the whole store') : undefined}
    >
      <option value="">{t('All branches')}</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </Select>
  );
}

/**
 * When the figures were computed, and a warning while tills still hold sales
 * that haven't reached the server (the figures may be incomplete).
 */
export function FreshnessNote({
  freshness,
  showWarning = true,
}: {
  freshness?: DataFreshness | null;
  // false when the page already shows the device warning
  showWarning?: boolean;
}) {
  if (!freshness) return null;
  const pending = !freshness.complete && showWarning;
  return (
    <div
      className={
        pending
          ? 'flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
          : 'flex items-center gap-1.5 text-xs text-gray-500'
      }
    >
      {pending ? <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Clock className="h-3.5 w-3.5" />}
      <span>
        {t('Generated {time}', { time: formatDateTime(freshness.generatedAt) })}
        {pending && (
          <>
            {' · '}
            {freshness.pendingSales > 0
              ? t('May be incomplete: {sales} sale(s) still waiting on {tills} till(s) to upload.', {
                  sales: freshness.pendingSales,
                  tills: freshness.devicesWithPendingSales,
                })
              : t('May be incomplete.')}
            {freshness.failedSales > 0 &&
              ` ${t('{count} sale(s) failed to upload.', { count: freshness.failedSales })}`}
          </>
        )}
      </span>
    </div>
  );
}

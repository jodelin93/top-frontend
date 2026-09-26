'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { getErrorMessage } from '@/lib/api/client';
import { Denominations, shiftsApi } from '@/lib/api/shifts';
import { t } from '@/i18n';

/**
 * Notes and coins cashiers count for the store currency (custom list or built-in defaults)
 */
export function ShiftsDenominations({ currency }: { currency: string }) {
  const { data, error } = useQuery({
    queryKey: ['shifts', 'denominations', currency],
    queryFn: () => shiftsApi.denominations(currency),
  });
  return (
    <SettingsSection
      title={t('Cash denominations')}
      description={t('Notes and coins counted when opening and closing a shift ({currency}).', { currency })}
    >
      {error && <ErrorMessage>{getErrorMessage(error, 'Could not load denominations')}</ErrorMessage>}
      {data && <DenominationsEditor key={data.denominations.join(',')} data={data} />}
    </SettingsSection>
  );
}

function DenominationsEditor({ data }: { data: Denominations }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(data.denominations.join(', '));
  const save = useMutation({
    mutationFn: (list: number[]) => shiftsApi.setDenominations(data.currencyCode, list),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts', 'denominations'] }),
  });
  const parsed = value
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  const invalid = parsed.some((n) => !Number.isFinite(n) || n <= 0);

  return (
    <div className="space-y-2 p-4">
      <ErrorMessage>{save.error ? getErrorMessage(save.error, 'Could not save') : null}</ErrorMessage>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('Denominations')} />
        <Button onClick={() => save.mutate(parsed)} disabled={save.isPending || invalid || parsed.length === 0}>
          {t('Save')}
        </Button>
        {data.custom && (
          <Button variant="outline" onClick={() => save.mutate([])} disabled={save.isPending}>
            {t('Use defaults')}
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {data.custom ? t('Custom list.') : t('Built-in defaults.')}{' '}
        {t('Separate values with commas, e.g. 100, 50, 20, 0.25.')}
      </p>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { SettingsSection } from '@/components/admin/settings-shared';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { settingsApi } from '@/lib/api/settings';
import { t } from '@/i18n';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Store setting businessDayCutoffHour: when the trading day starts (branch time).
 * Shifts and sales before that hour count for the previous business date.
 */
export function ShiftsBusinessDay() {
  const { data: settings } = useStoreSettings();
  const current = settings?.businessDayCutoffHour ?? 0;
  return (
    <SettingsSection
      title={t('Business day')}
      description={t(
        'When the trading day starts, in each branch timezone. With 04:00, a sale at 02:30 counts for the previous day.'
      )}
    >
      {settings && <BusinessDayForm key={current} current={current} />}
    </SettingsSection>
  );
}

function BusinessDayForm({ current }: { current: number }) {
  const queryClient = useQueryClient();
  const [hour, setHour] = useState(current);
  const [key, setKey] = useState(newIdempotencyKey);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await settingsApi.update({ businessDayCutoffHour: hour }, key);
      setKey(newIdempotencyKey());
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save settings'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 p-4">
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex items-end gap-2">
        <Field label={t('Day starts at')} htmlFor="business-day-cutoff">
          <Select id="business-day-cutoff" value={hour} onChange={(e) => setHour(Number(e.target.value))} className="w-32">
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {`${String(h).padStart(2, '0')}:00`}
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={save} disabled={busy || hour === current}>
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}

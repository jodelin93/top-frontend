'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/admin/page-header';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { settingsApi, StoreSettings } from '@/lib/api/settings';
import { t } from '@/i18n';

/**
 * Edit a group of store settings: keeps unsaved changes in a draft over the saved values
 */
export function useSettingsForm<K extends keyof StoreSettings>(keys: readonly K[]) {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  const [draft, setDraft] = useState<Partial<Pick<StoreSettings, K>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // Reused when a failed save is retried; a new one after each successful save
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const values = { ...(settings ? pick(settings, keys) : {}), ...draft } as Pick<StoreSettings, K>;
  const dirty = Object.keys(draft).length > 0;

  const set = <F extends K>(key: F, value: StoreSettings[F]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await settingsApi.update(draft as Partial<StoreSettings>, idempotencyKey);
      setIdempotencyKey(newIdempotencyKey());
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['pos', 'context'] });
      setDraft({});
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save settings'));
    } finally {
      setSaving(false);
    }
  };

  return { settings, values, set, save, dirty, saving, saved, error, isLoading, reset: () => setDraft({}) };
}

function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Pick<T, K>;
}

export function SaveBar({
  form,
}: {
  form: { save: () => void; dirty: boolean; saving: boolean; saved: boolean; error: string | null; reset: () => void };
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
      <ErrorMessage>{form.error}</ErrorMessage>
      {form.saved && !form.dirty && <span className="text-sm text-green-700">{t('Saved.')}</span>}
      {form.dirty && (
        <Button variant="outline" onClick={form.reset} disabled={form.saving}>
          {t('Discard changes')}
        </Button>
      )}
      <Button onClick={form.save} disabled={!form.dirty || form.saving}>
        <Save className="h-4 w-4" />
        {form.saving ? t('Saving...') : t('Save')}
      </Button>
    </div>
  );
}

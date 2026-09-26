'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/client';
import { ReportParams, SavedReportFilter, savedFiltersApi } from '@/lib/api/reports';
import { t } from '@/i18n';

export type SavedParams = SavedReportFilter['params'];

/**
 * Saved filters of one report: apply one in a click, save the current filters
 * under a name (optionally shared with everyone who can view reports), delete
 * your own.
 */
export function SavedFilters({
  reportKey,
  current,
  onApply,
}: {
  reportKey: string;
  // Current parameters; `preset` keeps a relative range ("last 7 days") relative
  current: ReportParams & { preset?: string };
  onApply: (params: SavedParams) => void;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: filters = [] } = useQuery({
    queryKey: ['report-filters', reportKey],
    queryFn: () => savedFiltersApi.list(reportKey),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['report-filters', reportKey] });

  const save = useMutation({
    mutationFn: () =>
      savedFiltersApi.create({
        reportKey,
        name: name.trim(),
        shared,
        // A relative range is saved as its preset, not as fixed dates
        params:
          current.preset && current.preset !== 'custom'
            ? { ...current, from: undefined, to: undefined }
            : current,
      }),
    onSuccess: (filter) => {
      setSaving(false);
      setName('');
      setShared(false);
      setError(null);
      setSelected(filter.id);
      void refresh();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the filter')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => savedFiltersApi.remove(id),
    onSuccess: () => {
      setSelected('');
      void refresh();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not delete the filter')),
  });

  const chosen = filters.find((f) => f.id === selected);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm">
      <Bookmark className="h-4 w-4 text-gray-400" />
      <Select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          const filter = filters.find((f) => f.id === e.target.value);
          if (filter) onApply(filter.params);
        }}
        className="h-8 w-56 text-xs"
        aria-label={t('Saved filters')}
      >
        <option value="">{filters.length > 0 ? t('Saved filters...') : t('No saved filters')}</option>
        {filters.map((filter) => (
          <option key={filter.id} value={filter.id}>
            {filter.name}
            {!filter.mine && filter.ownerName ? ` (${filter.ownerName})` : filter.shared ? ` · ${t('shared')}` : ''}
          </option>
        ))}
      </Select>
      {chosen?.mine && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={remove.isPending}
          onClick={() => remove.mutate(chosen.id)}
          aria-label={t('Delete saved filter')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {saving ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Filter name')}
            className="h-8 w-44 text-xs"
            maxLength={100}
            autoFocus
          />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            {t('Share with the team')}
          </label>
          <Button size="sm" type="submit" disabled={!name.trim() || save.isPending}>
            <Save className="h-4 w-4" />
            {t('Save')}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" type="button" onClick={() => setSaving(false)} aria-label={t('Cancel')}>
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setSaving(true)}>
          <Save className="h-4 w-4" />
          {t('Save filters')}
        </Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { Drawer, drawersApi } from '@/lib/api/shifts';
import { t } from '@/i18n';

/**
 * Cash drawers of a register (inside the register form: buttons only, no nested
 * form). Each drawer runs its own shift; a register keeps at least one active.
 */
export function RegisterDrawers({ registerId }: { registerId: string }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: drawers = [], isLoading } = useQuery({
    queryKey: ['drawers', registerId],
    queryFn: () => drawersApi.list(registerId),
  });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: ['drawers', registerId] });
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the drawer'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const ok = await run(() => drawersApi.create({ registerId, code: code.trim(), name: name.trim() }));
    if (ok) {
      setCode('');
      setName('');
    }
  };

  const toggle = (drawer: Drawer) =>
    run(() => drawersApi.update(drawer.id, { status: drawer.status === 'active' ? 'inactive' : 'active' }));

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">{t('Cash drawers')}</div>
      <ErrorMessage>{error}</ErrorMessage>
      {isLoading ? (
        <p className="text-xs text-gray-500">{t('Loading...')}</p>
      ) : (
        <ul className="divide-y text-sm">
          {drawers.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-1">
              <span className={d.status === 'active' ? '' : 'text-gray-400'}>
                <span className="font-mono text-xs">{d.code}</span> · {d.name}
                {d.activeShift && (
                  <span className="ml-2 text-xs text-blue-700">
                    {t('shift {number} open', { number: d.activeShift.shiftNumber })}
                  </span>
                )}
              </span>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => toggle(d)}>
                {d.status === 'active' ? t('Deactivate') : t('Activate')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('Code')}
          maxLength={50}
          className="w-24"
          aria-label={t('Drawer code')}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('e.g. Second drawer')}
          maxLength={100}
          aria-label={t('Drawer name')}
        />
        <Button type="button" variant="outline" disabled={busy || !code.trim() || !name.trim()} onClick={add}>
          {t('Add drawer')}
        </Button>
      </div>
    </div>
  );
}

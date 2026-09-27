'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DataCard, DataCardField, DataCardFields, DataCardHeader, useSmallScreen } from '@/components/ui/data-cards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useLocationOptions } from '@/components/admin/settings-shared';
import { useApproval } from '@/components/approval-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { inventoryApi, RebuildReport } from '@/lib/api/inventory';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/**
 * Rebuild stock quantities from the movement ledger: a dry run lists the
 * differences, then "Apply" overwrites the stored quantities (audited).
 */
export function InventoryRebuildDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { options: locations, labelFor } = useLocationOptions();
  const { withApproval, approvalDialog } = useApproval();
  const [locationId, setLocationId] = useState('');
  const [report, setReport] = useState<RebuildReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const preview = useMutation({
    mutationFn: () => inventoryApi.rebuildPreview(locationId || undefined),
    onMutate: () => setError(null),
    onSuccess: setReport,
    onError: (err) => setError(getErrorMessage(err, 'Could not check the ledger')),
  });

  const apply = useMutation({
    mutationFn: () => withApproval((headers) => inventoryApi.rebuildApply(locationId || undefined, headers)),
    onMutate: () => setError(null),
    onSuccess: async (result) => {
      setReport(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not rebuild stock')),
  });

  const differences = report ? report.totals.levels + report.totals.variants : 0;
  const busy = preview.isPending || apply.isPending;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5" />
              {t('Check stock against the ledger')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Every stock change is recorded as a movement, and that history is the source of truth. This recomputes the on-hand quantities from it and shows any difference before changing anything.'
              )}
            </DialogDescription>
          </DialogHeader>

          <ErrorMessage>{error}</ErrorMessage>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label={t('Scope')} htmlFor="rebuild-location" className="flex-1">
              <Select
                id="rebuild-location"
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setReport(null);
                }}
              >
                <option value="">{t('Whole store')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="outline" disabled={busy} onClick={() => preview.mutate()}>
              {preview.isPending ? t('Checking...') : t('Check (dry run)')}
            </Button>
          </div>

          {report && (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-md p-3 text-sm',
                  report.applied
                    ? 'bg-green-50 text-green-800'
                    : differences === 0
                      ? 'bg-green-50 text-green-800'
                      : 'bg-yellow-50 text-yellow-800'
                )}
              >
                {report.applied
                  ? t('Done: {levels} and {variants} were corrected.', {
                      levels: plural(report.totals.levels, '{count} location quantity', '{count} location quantities'),
                      variants: plural(report.totals.variants, '{count} product total', '{count} product totals'),
                    })
                  : differences === 0
                    ? t('Everything matches the ledger. Nothing to fix.')
                    : t('{levels} from the ledger, and {variants}.', {
                        levels: plural(
                          report.totals.levels,
                          '{count} location quantity differs',
                          '{count} location quantities differ'
                        ),
                        variants: plural(report.totals.variants, '{count} product total', '{count} product totals'),
                      })}
              </div>

              {report.levelDifferences.length > 0 && smallScreen ? (
                // Phones: one card per differing location quantity
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {report.levelDifferences.map((row) => (
                    <DataCard key={`${row.variantId}-${row.locationId}`} as="div">
                      <DataCardHeader
                        title={text(row.productName, '—')}
                        subtitle={<span className="font-mono">{row.sku}</span>}
                      />
                      <DataCardFields className="grid-cols-3">
                        <DataCardField label={t('Location')} className="col-span-3">
                          {labelFor(row.locationId, row.locationCode ?? '—')}
                        </DataCardField>
                        <DataCardField label={t('Stored')}>{row.projected}</DataCardField>
                        <DataCardField label={t('Ledger')}>{row.ledger}</DataCardField>
                        <DataCardField label={t('Change|difference')}>
                          <span className="font-medium">{signed(row.difference)}</span>
                        </DataCardField>
                      </DataCardFields>
                    </DataCard>
                  ))}
                </div>
              ) : report.levelDifferences.length > 0 && (
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t('Product')}</th>
                        <th className="px-3 py-2 font-medium">{t('Location')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('Stored')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('Ledger')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('Change|difference')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.levelDifferences.map((row) => (
                        <tr key={`${row.variantId}-${row.locationId}`}>
                          <td className="px-3 py-2">
                            <div className="font-medium">{text(row.productName, '—')}</div>
                            <div className="font-mono text-xs text-gray-500">{row.sku}</div>
                          </td>
                          <td className="px-3 py-2">{labelFor(row.locationId, row.locationCode ?? '—')}</td>
                          <td className="px-3 py-2 text-right">{row.projected}</td>
                          <td className="px-3 py-2 text-right">{row.ledger}</td>
                          <td className="px-3 py-2 text-right font-medium">{signed(row.difference)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.variantDifferences.length > 0 && (
                <p className="text-xs text-gray-500">
                  {t('Product totals to correct:')}{' '}
                  {report.variantDifferences
                    .slice(0, 20)
                    .map((row) => `${row.sku} ${row.current} → ${row.expected}`)
                    .join(', ')}
                  {report.variantDifferences.length > 20 && ', ...'}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t('Close')}
            </Button>
            {report && !report.applied && differences > 0 && (
              <Button
                disabled={busy}
                onClick={() =>
                  window.confirm(t('Overwrite the stored stock quantities with the ledger values?')) && apply.mutate()
                }
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {apply.isPending ? t('Applying...') : t('Apply corrections')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}

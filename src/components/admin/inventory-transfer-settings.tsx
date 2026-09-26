'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useCurrency, useStoreSettings } from '@/hooks/use-store-settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { TransferSettings, transfersApi } from '@/lib/api/inventory';
import { t } from '@/i18n';

// The transfer fields of the store settings (defaults as on the server)
export function useTransferSettings(): TransferSettings {
  const { data } = useStoreSettings();
  const settings = (data ?? {}) as Partial<TransferSettings>;
  return {
    transferApprovalMode: settings.transferApprovalMode ?? 'never',
    transferApprovalThreshold: settings.transferApprovalThreshold ?? 0,
    transferOverReceiptTolerancePercent: settings.transferOverReceiptTolerancePercent ?? 0,
  };
}

/**
 * When transfers need approval and how much over-receipt is accepted
 * (store settings; needs settings.manage). Mount only while open.
 */
export function TransferSettingsDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const current = useTransferSettings();
  const [mode, setMode] = useState(current.transferApprovalMode);
  const [threshold, setThreshold] = useState(String(current.transferApprovalThreshold));
  const [tolerance, setTolerance] = useState(String(current.transferOverReceiptTolerancePercent));
  const [error, setError] = useState<string | null>(null);
  // One per dialog: a retried save is not applied twice
  const [idempotencyKey] = useState(newIdempotencyKey);

  const save = useMutation({
    mutationFn: (input: Partial<TransferSettings>) => transfersApi.updateSettings(input, idempotencyKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the transfer settings')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const thresholdValue = Number(threshold.trim());
    const toleranceValue = Number(tolerance.trim());
    if (mode === 'threshold' && (threshold.trim() === '' || isNaN(thresholdValue) || thresholdValue < 0)) {
      return setError(t('Enter a threshold of 0 or more.'));
    }
    if (tolerance.trim() === '' || isNaN(toleranceValue) || toleranceValue < 0 || toleranceValue > 100) {
      return setError(t('Enter a tolerance between 0 and 100%.'));
    }
    save.mutate({
      transferApprovalMode: mode,
      ...(mode === 'threshold' && { transferApprovalThreshold: thresholdValue }),
      transferOverReceiptTolerancePercent: toleranceValue,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Transfer settings')}</DialogTitle>
          <DialogDescription>
            {t('When a transfer needs approval before it is dispatched, and how many extra units may be received.')}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('Approval before dispatch')} htmlFor="transfer-approval-mode">
            <Select
              id="transfer-approval-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as TransferSettings['transferApprovalMode'])}
            >
              <option value="never">{t('Never')}</option>
              <option value="threshold">{t('Above a value')}</option>
              <option value="always">{t('Always')}</option>
            </Select>
          </Field>
          {mode === 'threshold' && (
            <Field
              label={t('Approval threshold ({currency})', { currency })}
              htmlFor="transfer-approval-threshold"
              hint={t('Transfers worth more than this at cost need approval.')}
            >
              <Input
                id="transfer-approval-threshold"
                inputMode="decimal"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </Field>
          )}
          <Field
            label={t('Over-receipt tolerance (%)')}
            htmlFor="transfer-over-receipt"
            hint={t('Receiving more than was dispatched, up to this % of it, needs no approval. Above it a manager must approve.')}
          >
            <Input
              id="transfer-over-receipt"
              inputMode="decimal"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {save.isPending ? t('Saving...') : t('Save changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

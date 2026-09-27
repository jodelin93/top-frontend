'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileUp, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Table, THead, TBody, Th, Td, EmptyRow } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field, PageHeader } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import {
  PaymentMethodWithProvider,
  paymentsApi,
  SettlementLineRow,
  UnreconciledPayment,
} from '@/lib/api/payments';
import { paymentMethodsApi } from '@/lib/api/settings';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { t } from '@/i18n';
import { translateServerNote } from '@/lib/server-texts';

// Amounts in the store's currency
function useMoney() {
  const { data: settings } = useStoreSettings();
  return (value: number) => formatMoney(value, settings?.currencyCode ?? 'USD');
}

/**
 * Card settlements (R056): import what the acquirer paid out, match it to captured card
 * payments, and resolve what doesn't match on either side.
 */
export default function CardSettlementsPage() {
  const { user } = useAuthStore();
  const canReconcile = hasPermission(user, 'payments.reconcile');
  const canConfigure = hasPermission(user, 'settings.manage');
  const [provider, setProvider] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);

  if (!canReconcile) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <PageHeader title={t('Card settlements')} />
        <ErrorMessage>{t('You need the “Reconcile card settlements” permission to open this page.')}</ErrorMessage>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t('Card settlements')}
        description={t("Match the acquirer's settlement reports to the card payments taken at the till.")}
      />
      <ImportCard onImported={setBatchId} />
      <Unmatched provider={provider} onProvider={setProvider} />
      <Batches onOpen={setBatchId} />
      {canConfigure && <ProviderSettings />}
      <BatchDialog batchId={batchId} onClose={() => setBatchId(null)} />
    </div>
  );
}

function useProviders() {
  return useQuery({ queryKey: ['payments', 'providers'], queryFn: paymentsApi.providers, staleTime: 5 * 60_000 });
}

function ImportCard({ onImported }: { onImported: (batchId: string) => void }) {
  const queryClient = useQueryClient();
  const { data: providers = [] } = useProviders();
  const [provider, setProvider] = useState('manual');
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: () => paymentsApi.uploadSettlement(file!, { provider, reference: reference.trim() || undefined }),
    onSuccess: (batch) => {
      setFile(null);
      setReference('');
      if (fileRef.current) fileRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      onImported(batch.id);
    },
  });

  return (
    <Card className="space-y-4 bg-white p-4">
      <div>
        <h2 className="font-semibold">{t('Import a settlement report')}</h2>
        <p className="text-sm text-gray-500">
          {t('CSV with the columns')} <code>reference</code>, <code>amount</code>, <code>fee</code> {t('and')}{' '}
          <code>date</code>{' '}
          {t(
            '(common names such as “Transaction ID” or “Gross” also work). Lines are matched to captured payments by reference and amount.'
          )}
        </p>
      </div>
      <ErrorMessage>{upload.error ? getErrorMessage(upload.error, 'Import failed') : null}</ErrorMessage>
      <form
        className="grid gap-3 md:grid-cols-[12rem_1fr_1fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (file) upload.mutate();
        }}
      >
        <Field label={t('Provider')} htmlFor="settlement-provider">
          <Select id="settlement-provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
            {(providers.length ? providers : [{ name: 'manual', label: 'Manual' }]).map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Batch reference (optional)')} htmlFor="settlement-reference">
          <Input
            id="settlement-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t('e.g. payout 2026-09-21')}
          />
        </Field>
        <Field label={t('CSV file')} htmlFor="settlement-file">
          {/* Native file input hidden: its button text follows the browser's language */}
          <input
            id="settlement-file"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex h-10 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {t('Choose file')}
            </Button>
            <span className="min-w-0 truncate text-sm text-gray-500">{file ? file.name : t('No file chosen')}</span>
          </div>
        </Field>
        <Button type="submit" disabled={!file || upload.isPending}>
          <FileUp className="h-4 w-4" />
          {upload.isPending ? t('Importing...') : t('Import')}
        </Button>
      </form>
    </Card>
  );
}

function Unmatched({ provider, onProvider }: { provider: string; onProvider: (value: string) => void }) {
  const money = useMoney();
  const { data: providers = [] } = useProviders();
  const { data, isLoading, error } = useQuery({
    queryKey: ['settlements', 'unmatched', provider],
    queryFn: () => paymentsApi.unmatched(provider || undefined),
  });
  const [resolving, setResolving] = useState<
    { kind: 'line'; line: SettlementLineRow } | { kind: 'payment'; payment: UnreconciledPayment } | null
  >(null);

  const lines = data?.lines ?? [];
  const payments = data?.payments ?? [];
  const smallScreen = useSmallScreen();

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">{t('To reconcile')}</h2>
          <p className="text-sm text-gray-500">
            {t('Settlement lines without a payment, and captured card payments no settlement has covered yet.')}
          </p>
        </div>
        <Select
          value={provider}
          onChange={(e) => onProvider(e.target.value)}
          className="md:w-48"
          aria-label={t('Filter by provider')}
        >
          <option value="">{t('All providers')}</option>
          {providers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load unreconciled items')}</ErrorMessage>
        </div>
      )}

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x">
        <div>
          <h3 className="px-4 pt-3 text-sm font-medium">{t('Settlement lines without a payment ({count})', { count: lines.length })}</h3>
          {smallScreen ? (
            <DataCards
              items={lines}
              getKey={(line) => line.id}
              loading={isLoading}
              loadingText={t('Loading...')}
              emptyText={t('Nothing to resolve.')}
            >
              {(line) => (
                <>
                  <DataCardHeader
                    title={
                      <span className="font-mono text-xs">
                        {line.reference || <span className="text-gray-400">{t('no reference')}</span>}
                      </span>
                    }
                    subtitle={line.resolutionNote && <span className="text-amber-700">{translateServerNote(line.resolutionNote)}</span>}
                  />
                  <DataCardFields>
                    <DataCardField label={t('Settled')}>{formatDate(line.settledDate)}</DataCardField>
                    <DataCardField label={t('Amount')}>{money(line.amount)}</DataCardField>
                  </DataCardFields>
                  <DataCardActions>
                    <Button size="sm" variant="outline" onClick={() => setResolving({ kind: 'line', line })}>
                      {t('Resolve')}
                    </Button>
                  </DataCardActions>
                </>
              )}
            </DataCards>
          ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Reference')}</Th>
                <Th>{t('Settled')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={4}>{t('Loading...')}</EmptyRow>
              ) : lines.length === 0 ? (
                <EmptyRow colSpan={4}>{t('Nothing to resolve.')}</EmptyRow>
              ) : (
                lines.map((line) => (
                  <tr key={line.id}>
                    <Td className="font-mono text-xs">
                      {line.reference || <span className="text-gray-400">{t('no reference')}</span>}
                      {line.resolutionNote && <div className="font-sans text-amber-700">{translateServerNote(line.resolutionNote)}</div>}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(line.settledDate)}</Td>
                    <Td className="text-right">{money(line.amount)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setResolving({ kind: 'line', line })}>
                        {t('Resolve')}
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
          )}
        </div>
        <div>
          <h3 className="px-4 pt-3 text-sm font-medium">{t('Card payments not yet settled ({count})', { count: payments.length })}</h3>
          {smallScreen ? (
            <DataCards
              items={payments}
              getKey={(payment) => payment.id}
              loading={isLoading}
              loadingText={t('Loading...')}
              emptyText={t('Every card payment is reconciled.')}
            >
              {(payment) => (
                <>
                  <DataCardHeader
                    title={<span className="font-mono text-xs">{payment.saleNumber}</span>}
                    subtitle={`${formatDateTime(payment.paymentDate)} · ${text(payment.methodName, payment.provider)}`}
                  />
                  <DataCardFields>
                    <DataCardField label={t('Reference')}>
                      <span className="font-mono text-xs">{payment.providerReference ?? payment.reference ?? '—'}</span>
                    </DataCardField>
                    <DataCardField label={t('Amount')}>{money(payment.amount)}</DataCardField>
                  </DataCardFields>
                  <DataCardActions>
                    <Button size="sm" variant="outline" onClick={() => setResolving({ kind: 'payment', payment })}>
                      {t('Resolve')}
                    </Button>
                  </DataCardActions>
                </>
              )}
            </DataCards>
          ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Sale')}</Th>
                <Th>{t('Reference')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={4}>{t('Loading...')}</EmptyRow>
              ) : payments.length === 0 ? (
                <EmptyRow colSpan={4}>{t('Every card payment is reconciled.')}</EmptyRow>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td>
                      <span className="font-mono text-xs">{payment.saleNumber}</span>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(payment.paymentDate)} · {text(payment.methodName, payment.provider)}
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{payment.providerReference ?? payment.reference ?? '—'}</Td>
                    <Td className="text-right">{money(payment.amount)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setResolving({ kind: 'payment', payment })}>
                        {t('Resolve')}
                      </Button>
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
          )}
        </div>
      </div>
      <ResolveDialog target={resolving} payments={payments} onClose={() => setResolving(null)} />
    </Card>
  );
}

function ResolveDialog({
  target,
  payments,
  onClose,
}: {
  target: { kind: 'line'; line: SettlementLineRow } | { kind: 'payment'; payment: UnreconciledPayment } | null;
  payments: UnreconciledPayment[];
  onClose: () => void;
}) {
  const money = useMoney();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const resolve = useMutation({
    mutationFn: () =>
      target!.kind === 'line'
        ? paymentsApi.resolveLine(target!.line.id, { note: note.trim(), paymentId: paymentId || undefined })
        : paymentsApi.resolvePayment(target!.payment.id, note.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      close();
    },
  });

  const close = () => {
    setNote('');
    setPaymentId('');
    resolve.reset();
    onClose();
  };

  // Suggest payments of the same amount first
  const candidates =
    target?.kind === 'line'
      ? [...payments].sort(
          (a, b) =>
            Number(Math.abs(a.amount - target.line.amount) > 0.005) -
            Number(Math.abs(b.amount - target.line.amount) > 0.005)
        )
      : [];

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{target?.kind === 'line' ? t('Resolve settlement line') : t('Resolve card payment')}</DialogTitle>
          <DialogDescription>
            {target?.kind === 'line'
              ? t('{reference} · {amount}. Link the payment it belongs to, or explain why there is none.', {
                  reference: target.line.reference || t('No reference'),
                  amount: money(target.line.amount),
                })
              : target
                ? t('{sale} · {amount}. Record why no settlement line covers it (e.g. settled in another batch).', {
                    sale: target.payment.saleNumber,
                    amount: money(target.payment.amount),
                  })
                : ''}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) resolve.mutate();
          }}
        >
          <ErrorMessage>{resolve.error ? getErrorMessage(resolve.error, 'Could not resolve') : null}</ErrorMessage>
          {target?.kind === 'line' && (
            <Field label={t('Payment (optional)')} htmlFor="resolve-payment">
              <Select id="resolve-payment" value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
                <option value="">{t('No payment — write it off with a note')}</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.saleNumber} · {money(p.amount)} · {p.providerReference ?? p.reference ?? t('no ref')}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t('Note')} htmlFor="resolve-note">
            <Input
              id="resolve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('e.g. Terminal batch closed late')}
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={!note.trim() || resolve.isPending}>
              {paymentId ? <Link2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {paymentId ? t('Match and resolve') : t('Resolve')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Batches({ onOpen }: { onOpen: (id: string) => void }) {
  const money = useMoney();
  const { data, isLoading, error } = useQuery({
    queryKey: ['settlements', 'batches'],
    queryFn: () => paymentsApi.batches({ limit: 25 }),
  });
  const batches = data?.data ?? [];
  const smallScreen = useSmallScreen();

  return (
    <Card className="bg-white">
      <div className="border-b p-4">
        <h2 className="font-semibold">{t('Imported batches')}</h2>
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load batches')}</ErrorMessage>
        </div>
      )}
      {smallScreen ? (
        <DataCards
          items={batches}
          getKey={(batch) => batch.id}
          onItemClick={(batch) => onOpen(batch.id)}
          loading={isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No settlement imported yet.')}
        >
          {(batch) => (
            <>
              <DataCardHeader
                title={formatDateTime(batch.createdAt)}
                subtitle={[batch.provider, batch.reference].filter(Boolean).join(' · ')}
                onTitleClick={() => onOpen(batch.id)}
                badge={
                  <Badge variant={batch.matchedCount === batch.lineCount ? 'success' : 'warning'}>
                    {batch.matchedCount}/{batch.lineCount}
                  </Badge>
                }
              />
              <DataCardFields>
                <DataCardField label={t('Amount')}>{money(batch.totalAmount)}</DataCardField>
                <DataCardField label={t('Fees')}>{money(batch.totalFees)}</DataCardField>
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Imported')}</Th>
            <Th>{t('Provider')}</Th>
            <Th>{t('Reference')}</Th>
            <Th className="text-right">{t('Lines')}</Th>
            <Th className="text-right">{t('Matched')}</Th>
            <Th className="text-right">{t('Amount')}</Th>
            <Th className="text-right">{t('Fees')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading...')}</EmptyRow>
          ) : batches.length === 0 ? (
            <EmptyRow colSpan={7}>{t('No settlement imported yet.')}</EmptyRow>
          ) : (
            batches.map((batch) => (
              <tr key={batch.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onOpen(batch.id)}>
                <Td className="whitespace-nowrap">
                  <button type="button" className="hover:underline" onClick={() => onOpen(batch.id)}>
                    {formatDateTime(batch.createdAt)}
                  </button>
                </Td>
                <Td>{batch.provider}</Td>
                <Td>{batch.reference ?? '—'}</Td>
                <Td className="text-right">{batch.lineCount}</Td>
                <Td className="text-right">
                  <Badge variant={batch.matchedCount === batch.lineCount ? 'success' : 'warning'}>
                    {batch.matchedCount}/{batch.lineCount}
                  </Badge>
                </Td>
                <Td className="text-right">{money(batch.totalAmount)}</Td>
                <Td className="text-right">{money(batch.totalFees)}</Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}
    </Card>
  );
}

function BatchDialog({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const money = useMoney();
  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['settlements', 'batch', batchId],
    queryFn: () => paymentsApi.batch(batchId!),
    enabled: !!batchId,
  });
  const smallScreen = useSmallScreen();

  return (
    <Dialog open={!!batchId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Settlement batch {reference}', { reference: batch?.reference ?? '' })}</DialogTitle>
          <DialogDescription>
            {batch
              ? t('{provider} · {matched} of {lines} lines matched · {gross} gross, {fees} fees', {
                  provider: batch.provider,
                  matched: batch.matchedCount,
                  lines: batch.lineCount,
                  gross: money(batch.totalAmount),
                  fees: money(batch.totalFees),
                })
              : t('Loading...')}
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorMessage>{getErrorMessage(error, 'Could not load the batch')}</ErrorMessage>}
        <div className="max-h-[60vh] overflow-y-auto">
          {smallScreen ? (
            <DataCards
              items={batch?.lines ?? []}
              getKey={(line) => line.id}
              loading={isLoading}
              loadingText={t('Loading...')}
              className="p-0"
            >
              {(line) => (
                <>
                  <DataCardHeader
                    title={<span className="font-mono text-xs">{line.reference || '—'}</span>}
                    subtitle={line.resolutionNote ? translateServerNote(line.resolutionNote) : undefined}
                    badge={
                      <Badge variant={line.status === 'unmatched' ? 'warning' : statusVariant('completed')}>
                        {t(line.status)}
                      </Badge>
                    }
                  />
                  <DataCardFields>
                    <DataCardField label={t('Settled')}>{formatDate(line.settledDate)}</DataCardField>
                    <DataCardField label={t('Sale')}>
                      <span className="font-mono text-xs">{line.saleNumber ?? '—'}</span>
                    </DataCardField>
                    <DataCardField label={t('Amount')}>{money(line.amount)}</DataCardField>
                    <DataCardField label={t('Fee')}>{money(line.fee)}</DataCardField>
                  </DataCardFields>
                </>
              )}
            </DataCards>
          ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Reference')}</Th>
                <Th>{t('Settled')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th className="text-right">{t('Fee')}</Th>
                <Th>{t('Status')}</Th>
                <Th>{t('Sale')}</Th>
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={6}>{t('Loading...')}</EmptyRow>
              ) : (
                (batch?.lines ?? []).map((line) => (
                  <tr key={line.id}>
                    <Td className="font-mono text-xs">
                      {line.reference || '—'}
                      {line.resolutionNote && <div className="font-sans text-gray-500">{translateServerNote(line.resolutionNote)}</div>}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(line.settledDate)}</Td>
                    <Td className="text-right">{money(line.amount)}</Td>
                    <Td className="text-right">{money(line.fee)}</Td>
                    <Td>
                      <Badge variant={line.status === 'unmatched' ? 'warning' : statusVariant('completed')}>
                        {t(line.status)}
                      </Badge>
                    </Td>
                    <Td className="font-mono text-xs">{line.saleNumber ?? '—'}</Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Which provider adapter each card payment method uses
 */
function ProviderSettings() {
  const queryClient = useQueryClient();
  const { data: providers = [] } = useProviders();
  const { data: methods = [], error } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list() as Promise<PaymentMethodWithProvider[]>,
  });
  const update = useMutation({
    mutationFn: ({ id, provider }: { id: string; provider: string }) => paymentsApi.setMethodProvider(id, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'context'] });
    },
  });
  const cardMethods = methods.filter((m) => m.methodType !== 'cash');

  return (
    <Card className="space-y-3 bg-white p-4">
      <div>
        <h2 className="font-semibold">{t('Card terminal per payment method')}</h2>
        <p className="text-sm text-gray-500">
          <strong>manual</strong>
          {t(
            ': the cashier runs the card on a standalone terminal and types the approval code. Integrated providers charge the terminal themselves and the sale waits until the payment is captured.'
          )}
        </p>
      </div>
      {error && <ErrorMessage>{getErrorMessage(error, 'Could not load payment methods')}</ErrorMessage>}
      {update.error && <ErrorMessage>{getErrorMessage(update.error, 'Could not change the provider')}</ErrorMessage>}
      {cardMethods.length === 0 ? (
        <p className="text-sm text-gray-500">{t('No card or other non-cash payment methods yet.')}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {cardMethods.map((method) => (
            <li key={method.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span>
                {text(method.name, method.code)} <span className="text-xs text-gray-500">({t(method.methodType)})</span>
              </span>
              <Select
                value={method.provider ?? 'manual'}
                onChange={(e) => update.mutate({ id: method.id, provider: e.target.value })}
                className="sm:w-56"
                aria-label={t('Provider for {name}', { name: text(method.name, method.code) })}
                disabled={update.isPending}
              >
                {providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

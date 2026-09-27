'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, FileSpreadsheet, FileText, Printer, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import {
  DateRange,
  DateRangeFilter,
  endOfDayIso,
  presetRange,
  RangePreset,
  startOfDayIso,
  toDateInput,
} from '@/components/admin/reports-date-range';
import { BranchFilter, FreshnessNote } from '@/components/admin/reports-filters';
import { BackgroundExportButton, ExportJobsPanel } from '@/components/admin/reports-exports';
import { SavedFilters, SavedParams } from '@/components/admin/reports-saved-filters';
import { SalesHeatmap } from '@/components/admin/reports-heatmap';
import { ParameterValues, ReportParameters } from '@/components/admin/reports-parameters';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { ExportFormat, ReportColumn, ReportInfo, ReportParams, reportsApi } from '@/lib/api/reports';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const RECONCILIATION = 'reconciliation';

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const canExport = hasPermission(user, 'reports.export');
  const [selected, setSelected] = useState<string>('sales-by-day');
  const [range, setRange] = useState<DateRange>(() => presetRange('7d'));
  const [branchId, setBranchId] = useState('');
  const [parameters, setParameters] = useState<ParameterValues>({});
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const from = range.from ? startOfDayIso(range.from) : '';
  const to = range.to ? endOfDayIso(range.to) : '';

  const { data: catalog = [] } = useQuery({ queryKey: ['reports', 'catalog'], queryFn: reportsApi.catalog, staleTime: Infinity });
  const groups = useMemo(() => {
    const map = new Map<string, ReportInfo[]>();
    catalog.forEach((r) => map.set(r.group, [...(map.get(r.group) ?? []), r]));
    return [...map.entries()];
  }, [catalog]);
  const report = catalog.find((r) => r.key === selected);
  const titleOf = (key: string) => t(catalog.find((r) => r.key === key)?.title ?? key);

  // A saved filter: its relative range (preset) or fixed dates, branch and parameters
  const applySaved = (params: SavedParams) => {
    if (params.preset && params.preset !== 'custom') {
      setRange(presetRange(params.preset as Exclude<RangePreset, 'custom'>));
    } else if (params.from && params.to) {
      setRange({ preset: 'custom', from: toDateInput(new Date(params.from)), to: toDateInput(new Date(params.to)) });
    }
    setBranchId(params.branchId ?? '');
    setParameters({
      variantId: params.variantId,
      variantLabel: params.variantId ? t('Saved item') : undefined,
      locationId: params.locationId,
    });
  };

  // End-of-day summary of the last day of the range (today by default)
  const printDailySummary = async () => {
    setPrinting(true);
    setPrintError(null);
    try {
      await reportsApi.dailySummaryPdf({
        date: range.to || toDateInput(new Date()),
        timezone,
        branchId: branchId || undefined,
      });
    } catch (err) {
      setPrintError(getErrorMessage(err, 'Could not build the daily summary'));
    } finally {
      setPrinting(false);
    }
  };

  const branchAware = selected === RECONCILIATION || !!report?.branchFilter;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        title={t('Reports')}
        description={t('Detailed reports for any period, with CSV, Excel and PDF export, plus a reconciliation check.')}
        actions={
          <>
            {(selected === RECONCILIATION || report?.usesDateRange) && (
              <DateRangeFilter value={range} onChange={setRange} presets={['today', 'yesterday', '7d', '30d', 'month']} />
            )}
            <BranchFilter value={branchAware ? branchId : ''} onChange={setBranchId} disabled={!branchAware} />
          </>
        }
      />

      {/* Phones: the report list becomes a picker */}
      <Card className="space-y-2 bg-white p-3 md:hidden">
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label={t('Report')}>
          {groups.map(([group, reports]) => (
            <optgroup key={group} label={t(group)}>
              {reports.map((r) => (
                <option key={r.key} value={r.key}>
                  {t(r.title)}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={RECONCILIATION}>{t('Reconciliation')}</option>
        </Select>
        {canExport && (
          <Button variant="outline" className="w-full" onClick={() => void printDailySummary()} disabled={printing}>
            <Printer className="h-4 w-4" />
            {printing ? t('Preparing...') : t('Daily summary (PDF)')}
          </Button>
        )}
        {printError && <p className="text-xs text-red-600">{printError}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr]">
        <Card className="h-fit bg-white p-2 max-md:hidden">
          {groups.map(([group, reports]) => (
            <div key={group} className="pb-2">
              <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t(group)}</div>
              {reports.map((r) => (
                <NavButton key={r.key} active={selected === r.key} onClick={() => setSelected(r.key)}>
                  {t(r.title)}
                </NavButton>
              ))}
            </div>
          ))}
          <div className="border-t pt-2">
            <NavButton active={selected === RECONCILIATION} onClick={() => setSelected(RECONCILIATION)}>
              <ShieldCheck className="h-4 w-4" />
              {t('Reconciliation')}
            </NavButton>
            {canExport && (
              <NavButton active={false} onClick={() => void printDailySummary()}>
                <Printer className="h-4 w-4" />
                {printing ? t('Preparing...') : t('Daily summary (PDF)')}
              </NavButton>
            )}
            {printError && <p className="px-3 py-1 text-xs text-red-600">{printError}</p>}
          </div>
        </Card>

        {selected === RECONCILIATION ? (
          <ReconciliationView from={from} to={to} branchId={branchId} />
        ) : report ? (
          <ReportView
            report={report}
            params={{
              ...(report.usesDateRange ? { from, to } : {}),
              timezone,
              ...(report.branchFilter && branchId ? { branchId } : {}),
              ...(parameters.variantId && report.parameters.some((p) => p.key === 'variantId')
                ? { variantId: parameters.variantId }
                : {}),
              ...(parameters.locationId && report.parameters.some((p) => p.key === 'locationId')
                ? { locationId: parameters.locationId }
                : {}),
            }}
            preset={range.preset}
            parameters={parameters}
            onParametersChange={setParameters}
            onApplySaved={applySaved}
            canExport={canExport}
            titleOf={titleOf}
          />
        ) : (
          <Card className="bg-white p-6 text-sm text-gray-500">{t('Loading reports...')}</Card>
        )}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100',
        active && 'bg-blue-50 font-medium text-blue-700 hover:bg-blue-50'
      )}
    >
      {children}
    </button>
  );
}

function ReportView({
  report,
  params,
  preset,
  parameters,
  onParametersChange,
  onApplySaved,
  canExport,
  titleOf,
}: {
  report: ReportInfo;
  params: ReportParams;
  preset: RangePreset;
  parameters: ParameterValues;
  onParametersChange: (value: ParameterValues) => void;
  onApplySaved: (params: SavedParams) => void;
  canExport: boolean;
  titleOf: (key: string) => string;
}) {
  const currency = useCurrency();
  const missingParameter = report.parameters.some((p) => p.required && !params[p.key]);
  const ready = (!report.usesDateRange || (!!params.from && !!params.to)) && !missingParameter;
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'run', report.key, params],
    queryFn: () => reportsApi.run(report.key, params),
    enabled: ready,
  });

  const download = async (format: ExportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      await reportsApi.export(report.key, format, params);
    } catch (err) {
      setExportError(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  // Money is shown in the row's own currency when the report has one
  const format = (column: ReportColumn, value: unknown, rowCurrency?: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    switch (column.type) {
      case 'money':
        return formatMoney(Number(value), typeof rowCurrency === 'string' && rowCurrency ? rowCurrency : currency);
      case 'percent':
        return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(Number(value));
      case 'number':
        return Number(value).toLocaleString();
      case 'date':
        return formatDate(`${String(value)}T00:00:00`);
      case 'datetime':
        return formatDateTime(String(value));
      default:
        // Statuses, movement types…: fixed values, shown translated
        return column.translate ? t(String(value)) : String(value);
    }
  };
  const numeric = (column: ReportColumn) => ['money', 'percent', 'number'].includes(column.type);
  const exportLabel: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel', pdf: 'PDF' };
  const exportIcon = { csv: Download, xlsx: FileSpreadsheet, pdf: FileText };

  return (
    <Card className="min-w-0 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">{t(report.title)}</h2>
          <p className="text-sm text-gray-500">
            {t(report.description)}
            {!report.usesDateRange && ` ${t('Shows the current state; the date range does not apply.')}`}
            {!report.branchFilter && ` ${t('Covers the whole store.')}`}
          </p>
        </div>
        {canExport && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {(['csv', 'xlsx', 'pdf'] as ExportFormat[]).map((f) => {
                const Icon = exportIcon[f];
                return (
                  <Button key={f} variant="outline" size="sm" disabled={!ready || !!exporting} onClick={() => download(f)}>
                    <Icon className="h-4 w-4" />
                    {exporting === f ? t('Exporting...') : exportLabel[f]}
                  </Button>
                );
              })}
            </div>
            <BackgroundExportButton reportKey={report.key} params={params} disabled={!ready} />
          </div>
        )}
      </div>

      <SavedFilters reportKey={report.key} current={{ ...params, preset }} onApply={onApplySaved} />
      <ReportParameters parameters={report.parameters} value={parameters} onChange={onParametersChange} />

      {(error || exportError) && (
        <div className="m-4">
          <ErrorMessage>{exportError ?? getErrorMessage(error, 'Could not run the report')}</ErrorMessage>
        </div>
      )}

      {data?.freshness && (
        <div className="px-4 pt-3">
          <FreshnessNote freshness={data.freshness} />
        </div>
      )}

      {data?.mixedCurrencies && (
        <p className="mt-3 border-y bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {t('This period has amounts in several currencies: money columns are not totalled, since currencies are never added together.')}
        </p>
      )}

      {report.key === 'sales-by-hour' && data && data.rows.length > 0 && (
        <SalesHeatmap rows={data.rows} defaultCurrency={currency} />
      )}

      <Table>
        <THead>
          <tr>
            {(data?.columns ?? report.columns).map((column) => (
              <Th key={column.key} className={cn(numeric(column) && 'text-right')}>
                {t(column.label)}
              </Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {missingParameter ? (
            <EmptyRow colSpan={report.columns.length}>{t('Choose an item to see its stock card.')}</EmptyRow>
          ) : !ready ? (
            <EmptyRow colSpan={report.columns.length}>{t('Choose a start and an end date.')}</EmptyRow>
          ) : isLoading ? (
            <EmptyRow colSpan={report.columns.length}>{t('Running report...')}</EmptyRow>
          ) : !data || data.rows.length === 0 ? (
            <EmptyRow colSpan={report.columns.length}>{t('No data for this period.')}</EmptyRow>
          ) : (
            data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {data.columns.map((column) => (
                  <Td key={column.key} className={cn('whitespace-nowrap', numeric(column) && 'text-right')}>
                    {format(column, row[column.key], row.currency)}
                  </Td>
                ))}
              </tr>
            ))
          )}
          {data && data.rows.length > 0 && Object.keys(data.totals).length > 0 && (
            <tr className="border-t-2 bg-gray-50 font-semibold">
              {data.columns.map((column, i) => (
                <Td key={column.key} className={cn('whitespace-nowrap', numeric(column) && 'text-right')}>
                  {i === 0
                    ? t('Total')
                    : column.key in data.totals
                      ? format(column, data.totals[column.key], data.rows[0]?.currency)
                      : ''}
                </Td>
              ))}
            </tr>
          )}
        </TBody>
      </Table>

      {canExport && <ExportJobsPanel reportTitle={titleOf} />}
    </Card>
  );
}

function ReconciliationView({ from, to, branchId }: { from: string; to: string; branchId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'reconciliation', from, to, branchId],
    queryFn: () => reportsApi.reconciliation({ from, to, branchId: branchId || undefined }),
    enabled: !!from && !!to,
  });

  return (
    <Card className="min-w-0 bg-white p-4">
      <h2 className="text-lg font-semibold">{t('Reconciliation')}</h2>
      <p className="mb-4 text-sm text-gray-500">
        {t(
          "Checks that every figure traces back to its source records: sale lines, payments, stock movements, returns and refunds. Anything that doesn't add up is listed so it can be investigated."
        )}
      </p>
      {error && <ErrorMessage>{getErrorMessage(error, 'Could not run the reconciliation')}</ErrorMessage>}
      {isLoading && <p className="text-sm text-gray-500">{t('Checking...')}</p>}
      {data && (
        <div className="space-y-4">
          <div
            className={cn(
              'flex items-center gap-2 rounded-md p-3 text-sm font-medium',
              data.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            )}
          >
            {data.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {data.passed
              ? t('Everything reconciles for {count} sale(s) in this period.', { count: data.saleCount })
              : t('Some records do not reconcile — see below.')}
          </div>

          {/* Control totals per currency: amounts in different currencies are never added */}
          {data.totals.map((totals) => {
            const money = (value: number) => formatMoney(value, totals.currencyCode);
            return (
              <div key={totals.currencyCode} className="space-y-2">
                {data.totals.length > 1 && (
                  <h3 className="text-sm font-semibold">{t('In {currency}', { currency: totals.currencyCode })}</h3>
                )}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Figure label={t('Sales total')} value={money(totals.salesTotal)} />
                  <Figure
                    label={t('Sum of sale lines')}
                    value={money(totals.linesTotal)}
                    warn={Math.abs(totals.linesTotal - totals.salesTotal) > 0.005}
                  />
                  <Figure
                    label={t('Payments (net of change)')}
                    value={money(totals.paymentsNet)}
                    warn={Math.abs(totals.paymentsNet - totals.salesTotal) > 0.005}
                  />
                  <Figure label={t('Returns total')} value={money(totals.returnsTotal)} />
                  <Figure
                    label={t('Refunds paid')}
                    value={money(totals.refundsPaid)}
                    warn={Math.abs(totals.refundsPaid - totals.returnsTotal) > 0.005}
                  />
                </div>
              </div>
            );
          })}

          <div className="divide-y rounded-md border">
            {data.checks.map((check) => (
              <div key={check.key} className="p-3">
                <div className="flex items-start gap-2">
                  {check.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{t(check.label)}</div>
                    <div className="text-xs text-gray-500">{t(check.description)}</div>
                    {!check.passed && (
                      <table className="mt-2 w-full text-xs">
                        <thead className="text-left text-gray-500">
                          <tr>
                            <th className="py-1">{t('Record|noun')}</th>
                            <th className="py-1 text-right">{t('Expected')}</th>
                            <th className="py-1 text-right">{t('Found')}</th>
                            <th className="py-1 pl-3">{t('Detail')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {check.issues.map((issue, i) => (
                            <tr key={i} className="border-t">
                              <td className="py-1 font-mono">{issue.reference}</td>
                              <td className="py-1 text-right">{issue.expected}</td>
                              <td className="py-1 text-right">{issue.actual}</td>
                              <td className="py-1 pl-3 text-gray-600">{issue.detail ? t(issue.detail) : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Figure({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('rounded-md border p-3', warn && 'border-red-300 bg-red-50')}>
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

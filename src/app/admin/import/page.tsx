'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { ImportRowsTable } from '@/components/admin/import-rows-table';
import { Select } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/client';
import {
  DEFAULT_IMPORT_POLICY,
  ImportPolicy,
  ImportPreview,
  ImportResult,
  importsApi,
  MAX_IMPORT_MB,
  MAX_IMPORT_ROWS,
} from '@/lib/api/imports';
import { downloadBlob } from '@/lib/api/storage';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { plural, t } from '@/i18n';

const COLUMNS: [string, string][] = [
  ['sku', 'Required. Existing products are matched on SKU.'],
  ['name', 'Required for new products.'],
  ['description', ''],
  ['category_code', 'Code of an existing category.'],
  ['brand', ''],
  ['barcode', 'Simple products only. Must not belong to another product.'],
  ['price, cost', 'Simple products only, e.g. 4.50. Existing prices are only replaced if you choose to.'],
  ['tax_category_code', 'Code of a tax category (Price lists & tax).'],
  ['product_type', 'simple (default), variable or composite. Can’t be changed later.'],
  ['reorder_point, min_stock_level', 'Whole numbers.'],
  ['allow_backorder', 'Accepted for older files, but ignored: selling below zero stock is never allowed.'],
  ['status', 'active, inactive or discontinued'],
];

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-gray-500">{t(label)}</div>
    </div>
  );
}

export default function ImportPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Default: update details of existing products, never their prices
  const [policy, setPolicy] = useState<ImportPolicy>(DEFAULT_IMPORT_POLICY);
  const canImport = hasPermission(user, 'catalog.import');

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const template = useMutation({
    mutationFn: () => importsApi.template(),
    onSuccess: (blob) => downloadBlob(blob, 'products-import-template.csv'),
    onError: (err) => setError(getErrorMessage(err, 'Could not download the template')),
  });

  const check = useMutation({
    mutationFn: ({ picked, chosen }: { picked: File; chosen: ImportPolicy }) => importsApi.preview(picked, chosen),
    onSuccess: setPreview,
    onError: (err) => setError(getErrorMessage(err, 'Could not read the file')),
  });

  const apply = useMutation({
    // Apply exactly the policy the preview was computed with
    mutationFn: () => importsApi.apply(file!, (preview?.summary.error ?? 0) > 0, preview?.policy ?? policy),
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Import failed')),
  });

  const pick = (picked: File | undefined) => {
    reset();
    if (!picked) return;
    if (picked.size > MAX_IMPORT_MB * 1024 * 1024) {
      setError(t('The file is larger than {size} MB. Split it into smaller files.', { size: MAX_IMPORT_MB }));
      return;
    }
    setFile(picked);
    check.mutate({ picked, chosen: policy });
  };

  // A new policy changes the plan: preview again
  const changePolicy = (next: ImportPolicy) => {
    setPolicy(next);
    if (file && !result) {
      setPreview(null);
      setError(null);
      check.mutate({ picked: file, chosen: next });
    }
  };

  const summary = preview?.summary;
  const toWrite = (summary?.create ?? 0) + (summary?.update ?? 0);
  const priceRows = preview?.rows.filter((r) => r.priceChanges?.length > 0).length ?? 0;
  const pricesApplied = preview?.policy.onExisting === 'update' && preview.policy.updatePrices;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Import products')}
        description={t("Create or update products from a CSV file. You'll see what will change before anything is saved.")}
        actions={
          <Button variant="outline" onClick={() => template.mutate()} disabled={template.isPending}>
            <Download className="h-4 w-4" />
            {t('Download template')}
          </Button>
        }
      />

      {!canImport && (
        <ErrorMessage>{t('You need the “Import products from CSV” permission to import products.')}</ErrorMessage>
      )}
      <ErrorMessage>{error}</ErrorMessage>

      <Card className="space-y-4 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{t('1. Choose a CSV file')}</h2>
            <p className="text-sm text-gray-500">
              {t('UTF-8 CSV with a header row, up to {rows} rows and {size} MB.', {
                rows: MAX_IMPORT_ROWS.toLocaleString(),
                size: MAX_IMPORT_MB,
              })}{' '}
              {t('Blank cells leave existing values unchanged.')}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {file && (
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                {t('Start over')}
              </Button>
            )}
            <Button onClick={() => inputRef.current?.click()} disabled={!canImport || check.isPending || apply.isPending}>
              <FileUp className="h-4 w-4" />
              {check.isPending ? t('Checking...') : file ? t('Choose another file') : t('Choose file')}
            </Button>
          </div>
        </div>
        {file && <p className="text-sm">{t('Selected:')} <strong>{file.name}</strong></p>}

        <div className="space-y-2 rounded-md border p-3 text-sm">
          <h3 className="font-medium">{t('Existing products (same SKU)')}</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={policy.onExisting}
              onChange={(e) =>
                changePolicy({ ...policy, onExisting: e.target.value as ImportPolicy['onExisting'] })
              }
              className="sm:w-72"
              aria-label={t('Existing products (same SKU)')}
              disabled={check.isPending || apply.isPending || !!result}
            >
              <option value="update">{t('Update their details')}</option>
              <option value="skip">{t('Leave them unchanged')}</option>
            </Select>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={policy.onExisting === 'update' && policy.updatePrices}
                disabled={policy.onExisting === 'skip' || check.isPending || apply.isPending || !!result}
                onChange={(e) => changePolicy({ ...policy, updatePrices: e.target.checked })}
              />
              {t('Also replace their prices and costs')}
            </label>
          </div>
          <p className="text-gray-500">
            {t('Prices of existing products are kept unless you tick this box. New products always get the price in the file.')}
          </p>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600">{t('Columns')}</summary>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {COLUMNS.map(([name, help]) => (
              <div key={name}>
                <dt className="inline font-mono text-xs">{name}</dt>
                {help && <dd className="inline text-gray-500"> — {t(help)}</dd>}
              </div>
            ))}
          </dl>
        </details>
      </Card>

      {preview && !result && (
        <Card className="space-y-4 bg-white p-4">
          <h2 className="font-semibold">{t('2. Review the changes')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="New products" value={summary!.create} tone="text-green-700" />
            <Stat label="Updates" value={summary!.update} tone="text-blue-700" />
            <Stat label="No change" value={summary!.skip} tone="text-gray-700" />
            <Stat label="Rows with errors" value={summary!.error} tone="text-red-700" />
          </div>
          {preview.unknownColumns.length > 0 && (
            <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              {t('These columns are not recognised and will be ignored: {columns}', { columns: preview.unknownColumns.join(', ') })}
            </p>
          )}
          {priceRows > 0 &&
            (pricesApplied ? (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                {plural(
                  priceRows,
                  '{count} existing product will get a new price or cost from the file.',
                  '{count} existing products will get a new price or cost from the file.'
                )}
              </p>
            ) : (
              <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                {plural(
                  priceRows,
                  '{count} existing product has a different price or cost in the file. Its current price is kept.',
                  '{count} existing products have a different price or cost in the file. Their current prices are kept.'
                )}
              </p>
            ))}
          <ImportRowsTable rows={preview.rows} />
          <div className="flex flex-col items-end gap-2">
            {summary!.error > 0 && toWrite > 0 && (
              <p className="text-sm text-gray-600">
                {t(
                  "Rows with errors will be skipped. Fix them and import the file again later; rows already imported won't be duplicated."
                )}
              </p>
            )}
            <Button onClick={() => apply.mutate()} disabled={!canImport || toWrite === 0 || apply.isPending}>
              {apply.isPending
                ? t('Importing...')
                : toWrite === 0
                  ? t('Nothing to import')
                  : plural(toWrite, 'Import {count} product', 'Import {count} products')}
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className="space-y-4 bg-white p-4">
          <h2 className="font-semibold">{t('Import finished')}</h2>
          {result.error && <ErrorMessage>{result.error}</ErrorMessage>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Created" value={result.created} tone="text-green-700" />
            <Stat label="Updated" value={result.updated} tone="text-blue-700" />
            <Stat label="Unchanged" value={result.skipped} tone="text-gray-700" />
            <Stat label="Not imported" value={result.failed} tone="text-red-700" />
          </div>
          <ImportRowsTable rows={result.rows} />
          <div className="flex justify-end">
            <Button variant="outline" onClick={reset}>
              {t('Import another file')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

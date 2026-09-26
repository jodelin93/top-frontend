'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import type { ImportAction, ImportPriceChange, ImportRow } from '@/lib/api/imports';
import { currentLocale, t } from '@/i18n';

const actionBadge: Record<ImportAction, { label: string; variant: 'success' | 'info' | 'default' | 'danger' }> = {
  create: { label: 'create', variant: 'success' },
  update: { label: 'update', variant: 'info' },
  skip: { label: 'no change', variant: 'default' },
  error: { label: 'error', variant: 'danger' },
};

const PAGE = 200;

const amount = (value: number | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);

/** 'Price change X → Y', flagged as kept or overwritten (never silent) */
function PriceChanges({ changes }: { changes: ImportPriceChange[] }) {
  return (
    <ul className="space-y-0.5">
      {changes.map((change) => {
        const values = { from: amount(change.from), to: amount(change.to) };
        return (
          <li key={change.field} className={change.applied ? 'text-amber-700' : 'text-gray-500'}>
            {change.field === 'price'
              ? t('Price change {from} → {to}', values)
              : t('Cost change {from} → {to}', values)}{' '}
            <span className="font-medium">
              {change.applied ? t('(will be overwritten)') : t('(not applied, current value kept)')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Rows of an import preview / result with their action and problems */
export function ImportRowsTable({ rows }: { rows: ImportRow[] }) {
  const [filter, setFilter] = useState<ImportAction | ''>(() => (rows.some((r) => r.action === 'error') ? 'error' : ''));
  const [limit, setLimit] = useState(PAGE);
  const visible = rows.filter((r) => !filter || r.action === filter);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          {t('{visible} of {total} rows', { visible: visible.length, total: rows.length })}
        </p>
        <Select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as ImportAction | '');
            setLimit(PAGE);
          }}
          className="w-44"
          aria-label={t('Filter rows')}
        >
          <option value="">{t('All rows')}</option>
          <option value="error">{t('Errors')}</option>
          <option value="create">{t('New products')}</option>
          <option value="update">{t('Updates')}</option>
          <option value="skip">{t('No change')}</option>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <THead>
            <tr>
              <Th className="w-16">{t('Line')}</Th>
              <Th>{t('SKU')}</Th>
              <Th>{t('Name')}</Th>
              <Th>{t('Action')}</Th>
              <Th>{t('Details')}</Th>
            </tr>
          </THead>
          <TBody>
            {visible.length === 0 ? (
              <EmptyRow colSpan={5}>{t('No rows.')}</EmptyRow>
            ) : (
              visible.slice(0, limit).map((row) => (
                <tr key={row.line} className={row.action === 'error' ? 'bg-red-50/40' : undefined}>
                  <Td className="text-gray-500">{row.line}</Td>
                  <Td className="font-mono text-xs">{row.sku || '—'}</Td>
                  <Td>{row.name ?? '—'}</Td>
                  <Td>
                    <Badge variant={actionBadge[row.action].variant}>{t(actionBadge[row.action].label)}</Badge>
                  </Td>
                  <Td className="text-xs">
                    {row.errors.length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4 text-red-700">
                        {row.errors.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-0.5">
                        {row.changes.length > 0 && (
                          <span className="text-gray-600">
                            {t('Changes: {changes}', { changes: row.changes.join(', ') })}
                          </span>
                        )}
                        {row.priceChanges?.length > 0 && <PriceChanges changes={row.priceChanges} />}
                      </div>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
      {visible.length > limit && (
        <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setLimit((l) => l + PAGE)}>
          {t('Show more')}
        </button>
      )}
    </div>
  );
}

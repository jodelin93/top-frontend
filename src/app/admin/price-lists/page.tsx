'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { PriceListFormDialog, priceListTypes } from '@/components/admin/price-lists-form-dialog';
import { PriceListEntries } from '@/components/admin/price-lists-entries';
import { TaxCategoriesSection } from '@/components/admin/tax-categories-section';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { branchesApi } from '@/lib/api/settings';
import { PriceList, priceListsApi } from '@/lib/api/price-lists';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const typeVariant = {
  standard: 'default',
  promotional: 'info',
  wholesale: 'warning',
  member: 'success',
} as const;

const statusLabels: Record<PriceList['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  scheduled: 'Scheduled',
};

// Translated sentence with its {placeholders} replaced by bold words
function withBold(sentence: string, words: Record<string, string>) {
  return sentence.split(/(\{\w+\})/).map((part, i) => {
    const word = words[part.slice(1, -1)];
    return part.startsWith('{') && word != null ? <strong key={i}>{word}</strong> : part;
  });
}

function validity(priceList: PriceList) {
  const { validFrom, validTo } = priceList;
  if (!validFrom && !validTo) return t('Always');
  if (!validTo) return t('From {date}', { date: formatDateTime(validFrom) });
  if (!validFrom) return t('Until {date}', { date: formatDateTime(validTo) });
  return `${formatDateTime(validFrom)} – ${formatDateTime(validTo)}`;
}

export default function PriceListsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PriceList | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: priceLists = [], isLoading, error: loadError } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => priceListsApi.list(),
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  const selected = priceLists.find((p) => p.id === selectedId) ?? null;

  const remove = useMutation({
    mutationFn: (priceList: PriceList) => priceListsApi.remove(priceList.id),
    onSuccess: (_data, priceList) => {
      if (priceList.id === selectedId) setSelectedId(null);
      return queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not delete price list')),
  });

  const openDialog = (priceList: PriceList | null) => {
    setEditing(priceList);
    setDialogOpen(true);
  };

  const handleDelete = (priceList: PriceList) => {
    if (!window.confirm(t('Delete price list "{name}" and all its prices?', { name: text(priceList.name, priceList.code) }))) return;
    setError(null);
    remove.mutate(priceList);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Price lists')}
        description={t('Special prices for promotions, wholesale customers or members.')}
        actions={
          <Button onClick={() => openDialog(null)} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('New price list')}
          </Button>
        }
      />

      <div className="flex gap-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        <Info className="h-5 w-5 shrink-0 text-blue-600" />
        <p>
          {withBold(
            t(
              '{standard} and {promotional} lists apply automatically at the POS while active and within their dates — when several match, the highest priority wins.'
            ),
            { standard: t('Standard'), promotional: t('promotional') }
          )}{' '}
          {withBold(t('{wholesale} and {member} lists only apply when the cashier chooses them.'), {
            wholesale: t('Wholesale'),
            member: t('member'),
          })}{' '}
          {t('Select a list to edit its prices.')}
        </p>
      </div>

      <Card className="bg-white">
        <div className="empty:hidden p-4 pb-0">
          <ErrorMessage>{error ?? (loadError && getErrorMessage(loadError, 'Could not load price lists'))}</ErrorMessage>
        </div>
        <Table>
          <THead>
            <tr>
              <Th>{t('Code')}</Th>
              <Th>{t('Name')}</Th>
              <Th>{t('Type')}</Th>
              <Th>{t('Currency')}</Th>
              <Th>{t('Branch')}</Th>
              <Th className="text-right">{t('Priority')}</Th>
              <Th>{t('Validity')}</Th>
              <Th>{t('Status')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={9}>{t('Loading price lists...')}</EmptyRow>
            ) : priceLists.length === 0 ? (
              <EmptyRow colSpan={9}>{t('No price lists yet. Create your first one.')}</EmptyRow>
            ) : (
              priceLists.map((priceList) => (
                <tr
                  key={priceList.id}
                  onClick={() => setSelectedId(priceList.id)}
                  className={cn(
                    'cursor-pointer',
                    priceList.id === selectedId ? 'bg-blue-50' : 'hover:bg-gray-50'
                  )}
                >
                  <Td className="font-mono text-xs">{priceList.code}</Td>
                  <Td className="font-medium">{text(priceList.name, '—')}</Td>
                  <Td>
                    <Badge variant={typeVariant[priceList.priceListType]}>
                      {t(
                        priceListTypes.find((type) => type.value === priceList.priceListType)?.label ??
                          priceList.priceListType
                      )}
                    </Badge>
                  </Td>
                  <Td>{priceList.currencyCode}</Td>
                  <Td>{priceList.branchId ? branchNames.get(priceList.branchId) ?? '—' : t('All branches')}</Td>
                  <Td className="text-right">{priceList.priority}</Td>
                  <Td className="text-gray-600">{validity(priceList)}</Td>
                  <Td>
                    <Badge variant={statusVariant(priceList.status)}>{t(statusLabels[priceList.status] ?? priceList.status)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDialog(priceList)}
                        aria-label={t('Edit {code}', { code: priceList.code })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(priceList)}
                        aria-label={t('Delete {code}', { code: priceList.code })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {selected && (
        // Keyed so unsaved edits don't carry over to another list
        <PriceListEntries key={selected.id} priceList={selected} onClose={() => setSelectedId(null)} />
      )}

      <TaxCategoriesSection />

      <PriceListFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        priceList={editing}
        onSaved={(saved) => setSelectedId(saved.id)}
      />
    </div>
  );
}

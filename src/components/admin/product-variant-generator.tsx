'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { parseOptions } from '@/components/admin/product-attributes-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import {
  AttributeSelection,
  attributesApi,
  GenerateVariantsResult,
  Product,
  productsApi,
} from '@/lib/api/products';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

const MONEY = /^(\d+(\.\d{1,2})?)?$/;

/**
 * Pick attribute values (e.g. Size S, M, L × Colour Red, Blue), preview every
 * combination, then create the missing ones as variants.
 */
export function ProductVariantGenerator({
  product,
  onCreated,
  onCancel,
}: {
  product: Product;
  onCreated: (count: number) => void;
  onCancel: () => void;
}) {
  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.list(),
  });
  const variantAttributes = useMemo(() => attributes.filter((a) => a.isVariantDefining), [attributes]);

  // attributeId → chosen values; starts from what the product was generated with last time
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries((product.variantAttributes ?? []).map((s) => [s.attributeId, s.values]))
  );
  // Free-text values for attributes without options
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [preview, setPreview] = useState<GenerateVariantsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selections = (): AttributeSelection[] =>
    variantAttributes
      .map((attribute) => ({
        attributeId: attribute.id,
        values: attribute.options?.length
          ? (selected[attribute.id] ?? [])
          : parseOptions(typed[attribute.id] ?? (selected[attribute.id] ?? []).join(', ')),
      }))
      .filter((s) => s.values.length > 0);

  const toggle = (attributeId: string, value: string) => {
    setPreview(null);
    setSelected((current) => {
      const values = current[attributeId] ?? [];
      return {
        ...current,
        [attributeId]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
      };
    });
  };

  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      productsApi.generateVariants(product.id, {
        attributes: selections(),
        dryRun,
        price: price ? Number(price) : undefined,
        cost: cost ? Number(cost) : undefined,
      }),
    onSuccess: (result) => {
      if (result.dryRun) setPreview(result);
      else onCreated(result.created.length);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not generate variants')),
  });

  const submit = (dryRun: boolean) => {
    setError(null);
    if (!selections().length) {
      setError(t('Choose at least one value'));
      return;
    }
    if (!MONEY.test(price) || !MONEY.test(cost)) {
      setError(t('Enter amounts like 4.50'));
      return;
    }
    run.mutate(dryRun);
  };

  return (
    <div className="space-y-4 rounded-md border bg-gray-50/60 p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Wand2 className="h-4 w-4" />
          {t('Generate variants')}
        </h3>
        <p className="text-xs text-gray-500">
          {t('Every combination of the chosen values becomes a variant. Combinations that already exist are skipped.')}{' '}
          {t('Manage the list of attributes with the Attributes button on the products page.')}
        </p>
      </div>
      <ErrorMessage>{error}</ErrorMessage>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t('Loading attributes...')}</p>
      ) : variantAttributes.length === 0 ? (
        <p className="text-sm text-gray-500">{t('No attributes yet. Create some (e.g. Size, Colour) first.')}</p>
      ) : (
        <div className="space-y-3">
          {variantAttributes.map((attribute) => (
            <div key={attribute.id} className="space-y-1">
              <div className="text-sm font-medium">{text(attribute.name, attribute.code)}</div>
              {attribute.options?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {attribute.options.map((option) => {
                    const on = (selected[attribute.id] ?? []).includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggle(attribute.id, option)}
                        aria-pressed={on}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          on ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  value={typed[attribute.id] ?? (selected[attribute.id] ?? []).join(', ')}
                  onChange={(e) => {
                    setPreview(null);
                    setTyped((current) => ({ ...current, [attribute.id]: e.target.value }));
                  }}
                  placeholder={t('Values separated by commas')}
                  aria-label={t('{name} values', { name: text(attribute.name, attribute.code) })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:w-1/2">
        <Field label={t('Price of new variants')} htmlFor="generate-price">
          <Input id="generate-price" inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t('Unit cost')} htmlFor="generate-cost">
          <Input id="generate-cost" inputMode="decimal" placeholder={t('Optional')} value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
      </div>

      {preview && (
        <div className="rounded-md border bg-white">
          <Table>
            <THead>
              <tr>
                <Th>{t('Variant')}</Th>
                <Th>{t('SKU')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {preview.combinations.length === 0 ? (
                <EmptyRow colSpan={3}>{t('Nothing to generate.')}</EmptyRow>
              ) : (
                preview.combinations.map((combo) => (
                  <tr key={combo.sku + combo.name}>
                    <Td>{combo.name}</Td>
                    <Td className="font-mono text-xs">{combo.sku}</Td>
                    <Td>{combo.exists ? <Badge>{t('exists')}</Badge> : <Badge variant="success">{t('new')}</Badge>}</Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('Cancel')}
        </Button>
        <Button type="button" variant="outline" disabled={run.isPending} onClick={() => submit(true)}>
          {t('Preview')}
        </Button>
        <Button type="button" disabled={run.isPending || !preview || preview.toCreate === 0} onClick={() => submit(false)}>
          {run.isPending
            ? t('Working...')
            : preview
              ? plural(preview.toCreate, 'Create {count} variant', 'Create {count} variants')
              : t('Create variants')}
        </Button>
      </div>
    </div>
  );
}

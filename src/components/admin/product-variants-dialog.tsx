'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Table, THead, TBody, Th, Td, EmptyRow } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { Product, ProductVariant, productsApi } from '@/lib/api/products';
import { ProductVariantGenerator } from '@/components/admin/product-variant-generator';
import { ProductBarcodesDialog } from '@/components/admin/product-barcodes-dialog';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { plural, t } from '@/i18n';

interface VariantDraft {
  sku: string;
  name: string;
  barcode: string;
  price: string;
  cost: string;
}

const statusLabels: Record<ProductVariant['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  discontinued: 'Discontinued',
};

const emptyDraft: VariantDraft = { sku: '', name: '', barcode: '', price: '', cost: '' };

const toDraft = (v: ProductVariant): VariantDraft => ({
  sku: v.sku,
  name: text(v.name),
  barcode: v.barcode ?? '',
  price: v.price != null ? String(v.price) : '',
  cost: v.cost != null ? String(v.cost) : '',
});

/**
 * Add, edit and discontinue the variants (sizes, colours, ...) of a product
 */
export function ProductVariantsDialog({
  product,
  onOpenChange,
  onChanged,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const currency = useCurrency();
  // Costs aren't sent to users without this permission: never clear what they can't see
  const canSeeCost = useAuthStore((s) => hasPermission(s.user, 'inventory.cost.view'));
  // null = not editing, 'new' = adding, otherwise the variant id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [barcodeVariant, setBarcodeVariant] = useState<ProductVariant | null>(null);

  // The detail includes attribute values and barcodes of each variant
  const { data: detail, refetch } = useQuery({
    queryKey: ['product', product?.id],
    queryFn: () => productsApi.get(product!.id),
    enabled: !!product,
  });
  const current = detail && detail.id === product?.id ? detail : product;
  const variants = [...(current?.variants ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const changed = () => {
    onChanged();
    void refetch();
  };

  const startEdit = (variant: ProductVariant | null) => {
    setError(null);
    setEditing(variant ? variant.id : 'new');
    setDraft(variant ? toDraft(variant) : { ...emptyDraft, sku: `${product?.sku ?? ''}-` });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setEditing(null);
      setError(null);
      setGenerating(false);
      setNotice(null);
    }
    onOpenChange(open);
  };

  const save = async () => {
    if (!product) return;
    if (!draft.sku.trim()) {
      setError(t('SKU is required'));
      return;
    }
    if (draft.price.trim() === '' || Number.isNaN(Number(draft.price))) {
      setError(t('Enter a price'));
      return;
    }
    setSaving(true);
    setError(null);
    const isNew = editing === 'new';
    const input = {
      sku: draft.sku.trim(),
      name: draft.name.trim() ? { en: draft.name.trim() } : isNew ? undefined : null,
      barcode: draft.barcode.trim() || (isNew ? undefined : null),
      price: Number(draft.price),
      cost: draft.cost.trim() === '' ? (isNew || !canSeeCost ? undefined : null) : Number(draft.cost),
    };
    try {
      if (isNew) {
        await productsApi.createVariant(product.id, input);
      } else if (editing) {
        await productsApi.updateVariant(product.id, editing, input);
      }
      setEditing(null);
      changed();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save variant'));
    } finally {
      setSaving(false);
    }
  };

  const discontinue = async (variant: ProductVariant) => {
    if (!product || !window.confirm(t('Discontinue variant {sku}?', { sku: variant.sku }))) return;
    try {
      await productsApi.discontinueVariant(product.id, variant.id);
      changed();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not discontinue variant'));
    }
  };

  const set = (field: keyof VariantDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [field]: e.target.value }));

  return (
    <Dialog open={!!product} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('Variants of {name}', { name: text(product?.name, product?.sku) })}</DialogTitle>
          <DialogDescription>
            {t('Each variant is sold separately with its own SKU, barcode, price and stock.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>
        {notice && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

        {generating && current && (
          <ProductVariantGenerator
            product={current}
            onCancel={() => setGenerating(false)}
            onCreated={(count) => {
              setGenerating(false);
              setNotice(plural(count, '{count} variant created.', '{count} variants created.'));
              changed();
            }}
          />
        )}

        <div className="rounded-md border">
          <Table>
            <THead>
              <tr>
                <Th>{t('Variant')}</Th>
                <Th>{t('Attributes')}</Th>
                <Th>{t('SKU')}</Th>
                <Th>{t('Barcode')}</Th>
                <Th className="text-right">{t('Price')}</Th>
                <Th className="text-right">{t('Cost')}</Th>
                <Th className="text-right">{t('Stock')}</Th>
                <Th>{t('Status')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {variants.length === 0 && editing !== 'new' && (
                <EmptyRow colSpan={9}>{t('No variants yet.')}</EmptyRow>
              )}
              {variants.map((variant) =>
                editing === variant.id ? (
                  <EditRow key={variant.id} draft={draft} set={set} onSave={save} onCancel={() => setEditing(null)} saving={saving} costHidden={!canSeeCost} />
                ) : (
                  <tr key={variant.id}>
                    <Td>{text(variant.name, '—')}</Td>
                    <Td className="text-xs text-gray-600">
                      {variant.attributeValues?.length
                        ? variant.attributeValues
                            .map((av) => `${text(av.attribute?.name, av.attribute?.code ?? '')}: ${av.value}`)
                            .join(', ')
                        : '—'}
                    </Td>
                    <Td className="font-mono text-xs">{variant.sku}</Td>
                    <Td className="font-mono text-xs">
                      {variant.barcode ?? '—'}
                      {(variant.barcodes?.filter((b) => !b.isPrimary).length ?? 0) > 0 && (
                        <span className="ml-1 text-gray-400">
                          +{variant.barcodes!.filter((b) => !b.isPrimary).length}
                        </span>
                      )}
                    </Td>
                    <Td className="text-right">{formatMoney(variant.price, currency)}</Td>
                    <Td className="text-right">{variant.cost != null ? formatMoney(variant.cost, currency) : '—'}</Td>
                    <Td className="text-right">{variant.stockQuantity}</Td>
                    <Td>
                      <Badge variant={statusVariant(variant.status)}>{t(statusLabels[variant.status] ?? variant.status)}</Badge>
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBarcodeVariant(variant)} aria-label={t('Barcodes of {name}', { name: variant.sku })} title={t('Barcodes')}>
                          <Barcode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(variant)} aria-label={t('Edit {sku}', { sku: variant.sku })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {variant.status !== 'discontinued' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => discontinue(variant)} aria-label={t('Discontinue {sku}', { sku: variant.sku })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              )}
              {editing === 'new' && (
                <EditRow draft={draft} set={set} onSave={save} onCancel={() => setEditing(null)} saving={saving} costHidden={!canSeeCost} />
              )}
            </TBody>
          </Table>
        </div>

        {editing === null && !generating && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => startEdit(null)}>
              <Plus className="h-4 w-4" />
              {t('Add variant')}
            </Button>
            {product?.productType === 'variable' && (
              <Button
                variant="outline"
                onClick={() => {
                  setNotice(null);
                  setGenerating(true);
                }}
              >
                <Wand2 className="h-4 w-4" />
                {t('Generate from attributes')}
              </Button>
            )}
          </div>
        )}

        {product && (
          <ProductBarcodesDialog
            productId={product.id}
            variant={barcodeVariant}
            onClose={() => setBarcodeVariant(null)}
            onChanged={changed}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditRow({
  draft,
  set,
  onSave,
  onCancel,
  saving,
  costHidden,
}: {
  draft: VariantDraft;
  set: (field: keyof VariantDraft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  costHidden?: boolean;
}) {
  return (
    <tr className="bg-blue-50/40">
      <Td><Input value={draft.name} onChange={set('name')} placeholder={t('e.g. Medium')} aria-label={t('Variant name')} /></Td>
      <Td />
      <Td><Input value={draft.sku} onChange={set('sku')} aria-label={t('SKU')} /></Td>
      <Td><Input value={draft.barcode} onChange={set('barcode')} aria-label={t('Barcode')} /></Td>
      <Td><Input value={draft.price} onChange={set('price')} inputMode="decimal" className="text-right" aria-label={t('Price')} /></Td>
      <Td>
        <Input
          value={draft.cost}
          onChange={set('cost')}
          inputMode="decimal"
          className="text-right"
          aria-label={t('Cost')}
          placeholder={costHidden ? '—' : undefined}
          title={costHidden ? t('Current cost hidden (needs permission to see costs). Leave empty to keep it.') : undefined}
        />
      </Td>
      <Td colSpan={3}>
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" onClick={onCancel}>{t('Cancel')}</Button>
          <Button size="sm" onClick={onSave} disabled={saving}>{saving ? t('Saving...') : t('Save')}</Button>
        </div>
      </Td>
    </tr>
  );
}

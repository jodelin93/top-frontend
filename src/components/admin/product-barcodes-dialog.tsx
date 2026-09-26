'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { ProductVariant, productsApi } from '@/lib/api/products';
import { t } from '@/i18n';

/**
 * All barcodes a variant can be scanned by. The primary one is the variant's own
 * barcode (edit it on the variant); extra ones are added and removed here.
 */
export function ProductBarcodesDialog({
  productId,
  variant,
  onClose,
  onChanged,
}: {
  productId: string;
  variant: ProductVariant | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryKey = ['variant-barcodes', variant?.id];

  const { data: barcodes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => productsApi.barcodes(productId, variant!.id),
    enabled: !!variant,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    onChanged();
  };

  const add = useMutation({
    mutationFn: () => productsApi.addBarcode(productId, variant!.id, barcode.trim()),
    onSuccess: async () => {
      setBarcode('');
      await refresh();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not add barcode')),
  });

  const remove = useMutation({
    mutationFn: (barcodeId: string) => productsApi.removeBarcode(productId, variant!.id, barcodeId),
    onSuccess: refresh,
    onError: (err) => setError(getErrorMessage(err, 'Could not remove barcode')),
  });

  return (
    <Dialog
      open={!!variant}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          setBarcode('');
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Barcodes of {name}', { name: variant ? text(variant.name, variant.sku) : '' })}</DialogTitle>
          <DialogDescription>
            {t('Scanning any of these finds the variant at the till. A barcode can belong to only one variant.')}
          </DialogDescription>
        </DialogHeader>
        <ErrorMessage>{error}</ErrorMessage>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!barcode.trim()) return;
            setError(null);
            add.mutate();
          }}
        >
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder={t('Scan or type a barcode')}
            aria-label={t('New barcode')}
            maxLength={100}
            autoFocus
          />
          <Button type="submit" disabled={add.isPending || !barcode.trim()}>
            <Plus className="h-4 w-4" />
            {t('Add')}
          </Button>
        </form>
        {isLoading ? (
          <p className="text-sm text-gray-400">{t('Loading barcodes...')}</p>
        ) : barcodes.length === 0 ? (
          <p className="text-sm text-gray-500">{t('No barcodes yet.')}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {barcodes.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2">
                <span className="font-mono text-sm">{row.barcode}</span>
                {row.isPrimary ? (
                  <Badge variant="info">{t('primary')}</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    disabled={remove.isPending}
                    onClick={() => {
                      setError(null);
                      remove.mutate(row.id);
                    }}
                    aria-label={t('Remove {barcode}', { barcode: row.barcode })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import {
  IMAGE_ACCEPT,
  MAX_IMAGE_MB,
  MAX_IMAGES_PER_PRODUCT,
  ProductImage,
  productsApi,
} from '@/lib/api/products';
import { checkImageFile } from '@/lib/api/storage';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Upload, order, choose the primary image of, and delete a product's photos.
 * The primary image is shown in the product list and on the POS grid.
 */
export function ProductImagesManager({ productId, onChanged }: { productId: string; onChanged?: () => void }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const queryKey = ['product-images', productId];

  const { data: images = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => productsApi.images(productId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    onChanged?.();
  };

  const mutate = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: refresh,
    onError: (err) => setError(getErrorMessage(err, 'Could not update images')),
  });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const picked = Array.from(files);
    const room = MAX_IMAGES_PER_PRODUCT - images.length;
    if (picked.length > room) {
      setError(t('A product can have at most {max} images ({room} more).', { max: MAX_IMAGES_PER_PRODUCT, room }));
      return;
    }
    const problems = picked.map((file) => checkImageFile(file, MAX_IMAGE_MB)).filter(Boolean);
    if (problems.length) {
      setError(problems.join(' '));
      return;
    }
    setUploading(picked.length);
    try {
      // One at a time keeps the order of the picked files
      for (const file of picked) {
        await productsApi.uploadImage(productId, file);
        setUploading((n) => n - 1);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload image'));
    } finally {
      setUploading(0);
      if (inputRef.current) inputRef.current.value = '';
      await refresh();
    }
  };

  const move = (image: ProductImage, offset: -1 | 1) => {
    const ids = images.map((i) => i.id);
    const index = ids.indexOf(image.id);
    const target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    mutate.mutate(() => productsApi.reorderImages(productId, ids));
  };

  const busy = mutate.isPending || uploading > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t('Images')}</h3>
          <p className="text-xs text-gray-500">
            {t(
              'JPEG, PNG or WebP, up to {size} MB each, {max} per product. The starred image is shown in lists and on the till.',
              { size: MAX_IMAGE_MB, max: MAX_IMAGES_PER_PRODUCT }
            )}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || images.length >= MAX_IMAGES_PER_PRODUCT}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? t('Uploading {count}...', { count: uploading }) : t('Add images')}
        </Button>
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {isLoading ? (
        <p className="text-sm text-gray-400">{t('Loading images...')}</p>
      ) : images.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-gray-400">{t('No images yet.')}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <li
              key={image.id}
              className={cn(
                'group relative overflow-hidden rounded-md border bg-gray-50',
                image.isPrimary && 'ring-2 ring-blue-500'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served from object storage */}
              <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-0.5 bg-white/90 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={busy || index === 0}
                  onClick={() => move(image, -1)}
                  aria-label={t('Move left')}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7', image.isPrimary && 'text-blue-600')}
                  disabled={busy || image.isPrimary}
                  onClick={() => mutate.mutate(() => productsApi.updateImage(productId, image.id, { isPrimary: true }))}
                  aria-label={image.isPrimary ? t('Primary image') : t('Make primary')}
                  title={image.isPrimary ? t('Primary image') : t('Make primary')}
                >
                  <Star className={cn('h-3.5 w-3.5', image.isPrimary && 'fill-current')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t('Delete this image?'))) {
                      mutate.mutate(() => productsApi.removeImage(productId, image.id));
                    }
                  }}
                  aria-label={t('Delete image')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={busy || index === images.length - 1}
                  onClick={() => move(image, 1)}
                  aria-label={t('Move right')}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

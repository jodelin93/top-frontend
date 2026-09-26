'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/api/client';
import { normalizeBarcode, Product, ProductInput, productsApi, unitsApi } from '@/lib/api/products';
import {
  BarcodeCheckHint,
  ProductBranchesPicker,
  ProductTagsInput,
  ProductUnitSelect,
} from '@/components/admin/product-catalog-fields';
import { categoriesApi } from '@/lib/api/categories';
import { taxCategoriesApi } from '@/lib/api/tax-categories';
import { ProductImagesManager } from '@/components/admin/product-images-manager';
import { text as localized } from '@/lib/api/crud';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

const optionalCount = z
  .string()
  .regex(/^\d*$/, 'Must be a whole number');

const optionalMoney = z
  .string()
  .regex(/^(\d+(\.\d{1,2})?)?$/, 'Enter an amount like 4.50');

const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(100),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  productType: z.enum(['simple', 'variable', 'composite']),
  status: z.enum(['active', 'inactive', 'discontinued']),
  brand: z.string().max(50),
  manufacturer: z.string().max(50),
  barcode: z.string().max(100),
  categoryId: z.string(),
  taxCategoryId: z.string(),
  price: optionalMoney,
  cost: optionalMoney,
  minStockLevel: optionalCount,
  reorderPoint: optionalCount,
  isSerialized: z.boolean(),
  isStockTracked: z.boolean(),
  tags: z.array(z.string()),
  unitId: z.string(),
  // Scale item code of a weighed product (weighted / price-embedded barcodes)
  pluCode: z.string().trim().regex(/^\d{0,6}$/, 'PLU code must be 1 to 6 digits'),
  branchIds: z.array(z.string()),
});

type ProductFormData = z.infer<typeof productSchema>;

// Simple products carry their price on their single default variant
const defaultVariant = (product?: Product | null) =>
  product?.variants?.length
    ? [...product.variants].sort((a, b) => a.sortOrder - b.sortOrder)[0]
    : undefined;

function toFormData(product?: Product | null): ProductFormData {
  const variant = defaultVariant(product);
  return {
    sku: product?.sku ?? '',
    name: product?.name.en ?? '',
    description: product?.description?.en ?? '',
    productType: product?.productType ?? 'simple',
    status: product?.status ?? 'active',
    brand: product?.brand ?? '',
    manufacturer: product?.manufacturer ?? '',
    barcode: product?.barcode ?? '',
    categoryId: product?.categoryId ?? '',
    taxCategoryId: product?.taxCategoryId ?? '',
    price: variant?.price != null ? String(variant.price) : '',
    cost: variant?.cost != null ? String(variant.cost) : '',
    minStockLevel: product?.minStockLevel?.toString() ?? '',
    reorderPoint: product?.reorderPoint?.toString() ?? '',
    isSerialized: product?.isSerialized ?? false,
    isStockTracked: product?.isStockTracked ?? true,
    tags: product?.tags ?? [],
    unitId: product?.unitId ?? '',
    pluCode: variant?.pluCode ?? '',
    // Only on the product detail (empty: sold at every branch)
    branchIds: product?.branchIds ?? [],
  };
}

// Empty fields are omitted on create and cleared (null) on update
function toInput(data: ProductFormData, product?: Product | null): ProductInput {
  const empty = product ? null : undefined;
  const text = (value: string) => value.trim() || empty;
  const count = (value: string) => (value === '' ? empty : Number(value));

  return {
    sku: data.sku.trim(),
    // Keep other locales intact when editing the English name/description
    name: { ...product?.name, en: data.name.trim() },
    description: data.description.trim()
      ? { ...product?.description, en: data.description.trim() }
      : empty,
    productType: data.productType,
    categoryId: data.categoryId || empty,
    // No tax category: the store's default tax rate applies
    taxCategoryId: data.taxCategoryId || empty,
    // Price/cost live on the default variant, so only simple products send them
    ...(data.productType === 'simple' && {
      price: data.price === '' ? (product ? undefined : 0) : Number(data.price),
      cost: data.cost === '' ? undefined : Number(data.cost),
      pluCode: data.pluCode.trim() || empty,
    }),
    brand: text(data.brand),
    manufacturer: text(data.manufacturer),
    barcode: normalizeBarcode(data.barcode) ?? empty,
    minStockLevel: count(data.minStockLevel),
    reorderPoint: count(data.reorderPoint),
    isSerialized: data.isSerialized,
    isStockTracked: data.isStockTracked,
    tags: data.tags,
    unitId: data.unitId || empty,
    // The assortment is only known once the product detail loaded: never clear it blindly
    ...((!product || product.branchIds) && { branchIds: data.branchIds }),
    ...(product && { status: data.status }),
  };
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Product to edit; null to create a new one
  product: Product | null;
  onSaved: (product: Product) => void;
  // Images are saved immediately (not with the form)
  onImagesChanged?: () => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved, onImagesChanged }: ProductFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!product;
  // Without it the API leaves costs out: the field would look empty (an empty field keeps the cost)
  const canSeeCost = useAuthStore((s) => hasPermission(s.user, 'inventory.cost.view'));
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    enabled: open,
  });
  const { data: taxCategories = [] } = useQuery({
    queryKey: ['tax-categories'],
    queryFn: () => taxCategoriesApi.list(),
    enabled: open,
  });

  // The branch assortment only comes with the product detail
  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ['products', product?.id, 'detail'],
    queryFn: () => productsApi.get(product!.id),
    enabled: open && !!product,
  });
  const branchIdsLoaded = !!detail && !detailLoading ? (detail.branchIds ?? []) : undefined;

  const {
    register,
    handleSubmit,
    reset,
    resetField,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: toFormData(product),
  });
  const productType = useWatch({ control, name: 'productType' });
  const barcode = useWatch({ control, name: 'barcode' });
  const unitId = useWatch({ control, name: 'unitId' });
  const pluCode = useWatch({ control, name: 'pluCode' });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => unitsApi.list(), enabled: open });
  // Units with decimals (kg, m, l): the product is weighed / measured at the till
  const measured = !!units.find((unit) => unit.id === unitId)?.allowsDecimals;

  // Also once the category lists arrive: a select can only show a saved value that is among its options
  const optionsLoaded = categories.length + taxCategories.length;
  useEffect(() => {
    if (open) {
      reset(toFormData(product));
    }
  }, [open, product, reset, optionsLoaded]);

  // After the reset above (declared later so it runs after it)
  useEffect(() => {
    if (open && detail && !detailLoading) resetField('branchIds', { defaultValue: detail.branchIds ?? [] });
  }, [open, detail, detailLoading, resetField, optionsLoaded]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: ProductFormData) => {
    setError(null);
    try {
      // branchIds is only sent once the saved assortment is known
      const input = toInput(data, product && { ...product, branchIds: branchIdsLoaded });
      const saved = product
        ? await productsApi.update(product.id, input)
        : await productsApi.create(input);
      onSaved(saved);
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save product'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit product') : t('New product')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('Update {name}.', { name: product.name.en ?? product.sku })
              : t('Add a product to your catalog.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" {...register('name')} autoFocus />
            </Field>
            <Field label="SKU" htmlFor="sku" error={errors.sku?.message}>
              <Input id="sku" {...register('sku')} />
            </Field>

            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register('description')}
              />
            </Field>

            <Field label="Barcode" htmlFor="barcode" error={errors.barcode?.message}>
              <Input
                id="barcode"
                {...register('barcode', {
                  // Same normalization as the API (spaces removed, letters upper-cased)
                  onBlur: (e) => setValue('barcode', normalizeBarcode(e.target.value) ?? ''),
                })}
              />
              <BarcodeCheckHint value={barcode} />
            </Field>
            <Field label="Type" htmlFor="productType">
              <select id="productType" className={selectClass} {...register('productType')}>
                <option value="simple">{t('Simple')}</option>
                <option value="variable">{t('Variable (has variants)')}</option>
                <option value="composite">{t('Composite (bundle)')}</option>
              </select>
            </Field>

            {productType === 'simple' ? (
              <>
                <Field label="Selling price" htmlFor="price" error={errors.price?.message}>
                  <Input id="price" inputMode="decimal" placeholder="0.00" {...register('price')} />
                </Field>
                {(canSeeCost || !isEdit) && (
                  <Field label="Unit cost" htmlFor="cost" error={errors.cost?.message}>
                    <Input id="cost" inputMode="decimal" placeholder={t('Optional')} {...register('cost')} />
                  </Field>
                )}
              </>
            ) : (
              <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 sm:col-span-2">
                {productType === 'variable'
                  ? t('Variable products are sold through their variants (e.g. sizes). Add variants and their prices after saving.')
                  : t('Composite products are sold through their variants. Add a variant with a price after saving.')}
              </p>
            )}

            <Field label="Category" htmlFor="categoryId">
              <select id="categoryId" className={selectClass} {...register('categoryId')}>
                <option value="">{t('No category')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {localized(category.name, category.code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tax category" htmlFor="taxCategoryId">
              <select id="taxCategoryId" className={selectClass} {...register('taxCategoryId')}>
                <option value="">{t('Store default tax rate')}</option>
                {taxCategories.map((taxCategory) => (
                  <option key={taxCategory.id} value={taxCategory.id}>
                    {localized(taxCategory.name, taxCategory.code)}
                    {taxCategory.taxRateId ? '' : ` ${t('(exempt)')}`}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
              <Input id="brand" {...register('brand')} />
            </Field>
            <Field label="Manufacturer" htmlFor="manufacturer" error={errors.manufacturer?.message}>
              <Input id="manufacturer" {...register('manufacturer')} />
            </Field>

            <Field label="Unit of measure" htmlFor="unitId">
              <Controller
                control={control}
                name="unitId"
                render={({ field }) => (
                  <ProductUnitSelect
                    id="unitId"
                    className={selectClass}
                    value={field.value}
                    onChange={field.onChange}
                    enabled={open}
                  />
                )}
              />
              <p className="text-xs text-gray-500">
                {measured
                  ? t('Sold by weight, length or volume: the till asks for the quantity (e.g. 1.250 kg).')
                  : t('Units with decimals (kg, m, l) are sold by weight, length or volume.')}
              </p>
            </Field>
            {productType === 'simple' && (measured || !!pluCode) && (
              <Field
                label={t('PLU (scale code)')}
                htmlFor="pluCode"
                error={errors.pluCode?.message && t(errors.pluCode.message)}
              >
                <Input id="pluCode" inputMode="numeric" maxLength={6} placeholder="1234" {...register('pluCode')} />
                <p className="text-xs text-gray-500">
                  {t('Item code the scale prints in weighed labels (barcodes starting with 20 to 29).')}
                </p>
              </Field>
            )}
            <Field label="Tags" htmlFor="tags">
              <Controller
                control={control}
                name="tags"
                render={({ field }) => <ProductTagsInput id="tags" value={field.value} onChange={field.onChange} />}
              />
            </Field>

            <Field label="Branch assortment" htmlFor="branchIds" className="sm:col-span-2">
              {isEdit && !branchIdsLoaded ? (
                <p id="branchIds" className="text-sm text-gray-400">{t('Loading branches...')}</p>
              ) : (
                <Controller
                  control={control}
                  name="branchIds"
                  render={({ field }) => (
                    <ProductBranchesPicker value={field.value} onChange={field.onChange} enabled={open} />
                  )}
                />
              )}
            </Field>

            <Field label="Min stock level" htmlFor="minStockLevel" error={errors.minStockLevel?.message}>
              <Input id="minStockLevel" inputMode="numeric" {...register('minStockLevel')} />
            </Field>
            <Field label="Reorder point" htmlFor="reorderPoint" error={errors.reorderPoint?.message}>
              <Input id="reorderPoint" inputMode="numeric" {...register('reorderPoint')} />
            </Field>

            {isEdit && (
              <Field label="Status" htmlFor="status">
                <select id="status" className={selectClass} {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="discontinued">{t('Discontinued')}</option>
                </select>
              </Field>
            )}

            <div className="flex flex-col justify-end gap-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register('isStockTracked')} />
                {t('Track stock (untick for services and other non-stock items)')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register('isSerialized')} />
                {t('Track serial numbers')}
              </label>
            </div>
          </div>

          {isEdit ? (
            <div className="border-t pt-4">
              <ProductImagesManager productId={product.id} onChanged={onImagesChanged} />
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t('You can add images after creating the product.')}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create product')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label htmlFor={htmlFor}>{t(label)}</Label>
      {children}
      {error && <p className="text-sm text-red-600">{t(error)}</p>}
    </div>
  );
}

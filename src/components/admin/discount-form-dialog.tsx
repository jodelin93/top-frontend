'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { flattenCategoryTree } from '@/components/admin/category-form-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { categoriesApi } from '@/lib/api/categories';
import { LocalizedText, text } from '@/lib/api/crud';
import { Discount, DiscountScope, DiscountType, discountsApi } from '@/lib/api/discounts';
import { productsApi } from '@/lib/api/products';
import { t } from '@/i18n';

const amount = z.string().regex(/^\d*(\.\d{0,4})?$/, 'Must be a positive number');
const count = z.string().regex(/^\d*$/, 'Must be a whole number');

const discountSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required').max(50),
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string(),
    discountType: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y']),
    scope: z.enum(['product', 'category', 'cart']),
    percentage: amount,
    value: amount,
    buyQuantity: count,
    getQuantity: count,
    minPurchaseAmount: amount,
    maxDiscountAmount: amount,
    usageLimit: count,
    priority: z.string().regex(/^(-?\d+)?$/, 'Must be a whole number'),
    validFrom: z.string(),
    validTo: z.string(),
    applicableProductIds: z.array(z.string()),
    applicableCategoryIds: z.array(z.string()),
    status: z.enum(['active', 'inactive', 'scheduled', 'expired']),
  })
  // Mirror the backend's per-type checks so errors show next to the field
  .superRefine((d, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (d.discountType === 'percentage') {
      if (d.percentage === '') issue('percentage', 'Percentage is required');
      else if (Number(d.percentage) > 100) issue('percentage', 'Must be 100 or less');
    }
    if (d.discountType === 'fixed_amount' && d.value === '') {
      issue('value', 'Amount is required');
    }
    if (d.discountType === 'buy_x_get_y') {
      if (!Number(d.buyQuantity)) issue('buyQuantity', 'Must be at least 1');
      if (!Number(d.getQuantity)) issue('getQuantity', 'Must be at least 1');
      if (d.scope === 'cart') issue('scope', 'Buy X get Y applies to products or categories');
    }
    if (d.scope === 'product' && d.applicableProductIds.length === 0) {
      issue('applicableProductIds', 'Select at least one product');
    }
    if (d.scope === 'category' && d.applicableCategoryIds.length === 0) {
      issue('applicableCategoryIds', 'Select at least one category');
    }
    if (d.usageLimit !== '' && Number(d.usageLimit) < 1) {
      issue('usageLimit', 'Must be at least 1');
    }
    if (d.validFrom && d.validTo && new Date(d.validTo) <= new Date(d.validFrom)) {
      issue('validTo', 'Must be after the start date');
    }
  });

type DiscountFormData = z.infer<typeof discountSchema>;

interface DiscountInput {
  code: string;
  name: LocalizedText;
  description?: LocalizedText | null;
  discountType: DiscountType;
  scope: DiscountScope;
  value?: number | null;
  percentage?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  minPurchaseAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  priority?: number;
  status?: Discount['status'];
}

// ISO timestamp → value for a datetime-local input (local time, no seconds)
function toLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const numberText = (value: number | string | null | undefined) =>
  value == null ? '' : Number(value).toString();

function toFormData(discount?: Discount | null): DiscountFormData {
  return {
    code: discount?.code ?? '',
    name: text(discount?.name),
    description: discount?.description?.en ?? '',
    discountType: discount?.discountType ?? 'percentage',
    scope: discount?.scope ?? 'cart',
    percentage: numberText(discount?.percentage),
    value: numberText(discount?.value),
    buyQuantity: numberText(discount?.buyQuantity),
    getQuantity: numberText(discount?.getQuantity),
    minPurchaseAmount: numberText(discount?.minPurchaseAmount),
    maxDiscountAmount: numberText(discount?.maxDiscountAmount),
    usageLimit: numberText(discount?.usageLimit),
    priority: numberText(discount?.priority),
    validFrom: toLocalInput(discount?.validFrom),
    validTo: toLocalInput(discount?.validTo),
    applicableProductIds: discount?.applicableProductIds ?? [],
    applicableCategoryIds: discount?.applicableCategoryIds ?? [],
    status: discount?.status ?? 'active',
  };
}

// Empty fields (and fields the type doesn't use) are omitted on create and cleared (null) on update
function toInput(data: DiscountFormData, discount?: Discount | null): DiscountInput {
  const empty = discount ? null : undefined;
  const num = (value: string, used = true) => (used && value !== '' ? Number(value) : empty);
  const date = (value: string) => (value ? new Date(value).toISOString() : empty);
  const type = data.discountType;

  return {
    code: data.code.trim(),
    // Keep other locales intact when editing the English name/description
    name: { ...discount?.name, en: data.name.trim() },
    description: data.description.trim()
      ? { ...discount?.description, en: data.description.trim() }
      : empty,
    discountType: type,
    scope: data.scope,
    percentage: num(data.percentage, type === 'percentage'),
    value: num(data.value, type === 'fixed_amount'),
    buyQuantity: num(data.buyQuantity, type === 'buy_x_get_y'),
    getQuantity: num(data.getQuantity, type === 'buy_x_get_y'),
    minPurchaseAmount: num(data.minPurchaseAmount),
    maxDiscountAmount: num(data.maxDiscountAmount),
    usageLimit: num(data.usageLimit),
    validFrom: date(data.validFrom),
    validTo: date(data.validTo),
    applicableProductIds: data.scope === 'product' ? data.applicableProductIds : [],
    applicableCategoryIds: data.scope === 'category' ? data.applicableCategoryIds : [],
    priority: data.priority === '' ? (discount ? 0 : undefined) : Number(data.priority),
    ...(discount && { status: data.status }),
  };
}

interface DiscountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Discount to edit; null to create a new one
  discount: Discount | null;
}

export function DiscountFormDialog({ open, onOpenChange, discount }: DiscountFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!discount;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: toFormData(discount),
  });

  useEffect(() => {
    if (open) {
      reset(toFormData(discount));
    }
  }, [open, discount, reset]);

  const discountType = useWatch({ control, name: 'discountType' });
  const scope = useWatch({ control, name: 'scope' });

  // Options for the product / category pickers, loaded only while the dialog is open
  const { data: products = [] } = useQuery({
    queryKey: ['products', { status: 'active' }],
    queryFn: () => productsApi.list({ status: 'active' }),
    enabled: open && scope === 'product',
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    enabled: open && scope === 'category',
  });

  const productOptions = useMemo(
    () => products.map((p) => ({ id: p.id, label: text(p.name, p.sku), detail: p.sku })),
    [products]
  );
  const categoryOptions = useMemo(
    () =>
      flattenCategoryTree(categories).map(({ category, depth }) => ({
        id: category.id,
        label: text(category.name, category.code),
        detail: category.code,
        depth,
      })),
    [categories]
  );

  const save = useMutation({
    mutationFn: (input: DiscountInput) =>
      discount ? discountsApi.update(discount.id, input) : discountsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: DiscountFormData) => {
    setError(null);
    try {
      await save.mutateAsync(toInput(data, discount));
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save discount'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit discount') : t('New discount')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('Update {name}.', { name: text(discount.name, discount.code) })
              : t('Create a promotion or a discount code for the POS.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="name" error={errors.name?.message && t(errors.name.message)}>
              <Input id="name" {...register('name')} autoFocus />
            </Field>
            <Field
              label={t('Code')}
              htmlFor="code"
              error={errors.code?.message && t(errors.code.message)}
              hint={t('Entered at the POS; saved in upper case.')}
            >
              <Input id="code" className="uppercase" {...register('code')} />
            </Field>

            <Field label={t('Description')} htmlFor="description" className="sm:col-span-2">
              <Textarea id="description" rows={2} {...register('description')} />
            </Field>

            <Field label={t('Type')} htmlFor="discountType">
              <Select id="discountType" {...register('discountType')}>
                <option value="percentage">{t('Percentage off')}</option>
                <option value="fixed_amount">{t('Fixed amount off')}</option>
                <option value="buy_x_get_y">{t('Buy X get Y free')}</option>
              </Select>
            </Field>
            <Field label={t('Applies to')} htmlFor="scope" error={errors.scope?.message && t(errors.scope.message)}>
              <Select id="scope" {...register('scope')}>
                <option value="cart" disabled={discountType === 'buy_x_get_y'}>
                  {t('Whole cart')}
                </option>
                <option value="product">{t('Specific products')}</option>
                <option value="category">{t('Specific categories')}</option>
              </Select>
            </Field>

            {discountType === 'percentage' && (
              <Field label={t('Percentage (%)')} htmlFor="percentage" error={errors.percentage?.message && t(errors.percentage.message)}>
                <Input id="percentage" inputMode="decimal" placeholder="10" {...register('percentage')} />
              </Field>
            )}
            {discountType === 'fixed_amount' && (
              <Field label={t('Amount off')} htmlFor="value" error={errors.value?.message && t(errors.value.message)}>
                <Input id="value" inputMode="decimal" placeholder="5.00" {...register('value')} />
              </Field>
            )}
            {discountType === 'buy_x_get_y' && (
              <>
                <Field label={t('Buy quantity')} htmlFor="buyQuantity" error={errors.buyQuantity?.message && t(errors.buyQuantity.message)}>
                  <Input id="buyQuantity" inputMode="numeric" placeholder="2" {...register('buyQuantity')} />
                </Field>
                <Field label={t('Get free quantity')} htmlFor="getQuantity" error={errors.getQuantity?.message && t(errors.getQuantity.message)}>
                  <Input id="getQuantity" inputMode="numeric" placeholder="1" {...register('getQuantity')} />
                </Field>
              </>
            )}

            {scope === 'product' && (
              <Field
                label={t('Products')}
                error={errors.applicableProductIds?.message && t(errors.applicableProductIds.message)}
                className="sm:col-span-2"
              >
                <Controller
                  control={control}
                  name="applicableProductIds"
                  render={({ field }) => (
                    <CheckboxList
                      options={productOptions}
                      value={field.value}
                      onChange={field.onChange}
                      searchPlaceholder={t('Filter products...')}
                      emptyText={t('No active products.')}
                    />
                  )}
                />
              </Field>
            )}
            {scope === 'category' && (
              <Field
                label={t('Categories')}
                error={errors.applicableCategoryIds?.message && t(errors.applicableCategoryIds.message)}
                className="sm:col-span-2"
              >
                <Controller
                  control={control}
                  name="applicableCategoryIds"
                  render={({ field }) => (
                    <CheckboxList
                      options={categoryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      searchPlaceholder={t('Filter categories...')}
                      emptyText={t('No categories.')}
                    />
                  )}
                />
              </Field>
            )}

            <Field
              label={t('Minimum purchase')}
              htmlFor="minPurchaseAmount"
              error={errors.minPurchaseAmount?.message && t(errors.minPurchaseAmount.message)}
            >
              <Input id="minPurchaseAmount" inputMode="decimal" placeholder={t('None')} {...register('minPurchaseAmount')} />
            </Field>
            <Field
              label={t('Maximum discount')}
              htmlFor="maxDiscountAmount"
              error={errors.maxDiscountAmount?.message && t(errors.maxDiscountAmount.message)}
            >
              <Input id="maxDiscountAmount" inputMode="decimal" placeholder={t('No cap')} {...register('maxDiscountAmount')} />
            </Field>

            <Field label={t('Usage limit')} htmlFor="usageLimit" error={errors.usageLimit?.message && t(errors.usageLimit.message)}>
              <Input id="usageLimit" inputMode="numeric" placeholder={t('Unlimited')} {...register('usageLimit')} />
            </Field>
            <Field
              label={t('Priority')}
              htmlFor="priority"
              error={errors.priority?.message && t(errors.priority.message)}
              hint={t('Higher priority discounts are applied first.')}
            >
              <Input id="priority" inputMode="numeric" placeholder="0" {...register('priority')} />
            </Field>

            <Field label={t('Valid from')} htmlFor="validFrom" error={errors.validFrom?.message && t(errors.validFrom.message)}>
              <Input id="validFrom" type="datetime-local" {...register('validFrom')} />
            </Field>
            <Field label={t('Valid until')} htmlFor="validTo" error={errors.validTo?.message && t(errors.validTo.message)}>
              <Input id="validTo" type="datetime-local" {...register('validTo')} />
            </Field>

            {isEdit && (
              <Field label={t('Status')} htmlFor="status">
                <Select id="status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="scheduled">{t('Scheduled')}</option>
                  <option value="expired">{t('Expired')}</option>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : isEdit ? t('Save changes') : t('Create discount')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Scrollable, filterable multi-select made of checkboxes
function CheckboxList({
  options,
  value,
  onChange,
  searchPlaceholder,
  emptyText,
}: {
  options: { id: string; label: string; detail?: string; depth?: number }[];
  value: string[];
  onChange: (value: string[]) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const visible = query
    ? options.filter((o) => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(query))
    : options;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span className="shrink-0 text-xs text-gray-500">{t('{count} selected', { count: value.length })}</span>
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border p-1">
        {visible.length === 0 ? (
          <p className="px-2 py-3 text-center text-sm text-gray-400">
            {options.length === 0 ? emptyText : t('No matches.')}
          </p>
        ) : (
          visible.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
              style={query ? undefined : { paddingLeft: 8 + (option.depth ?? 0) * 16 }}
            >
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={value.includes(option.id)}
                onChange={() => toggle(option.id)}
              />
              <span className="flex-1">{option.label}</span>
              {option.detail && <span className="font-mono text-xs text-gray-400">{option.detail}</span>}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

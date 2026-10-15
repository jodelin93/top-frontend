'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Download, ImageIcon, Layers, Pencil, Plus, Printer, Ruler, Search, SlidersHorizontal, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ProductFormDialog }from '@/components/admin/product-form-dialog';
import { ProductVariantsDialog } from '@/components/admin/product-variants-dialog';
import { ProductAttributesDialog } from '@/components/admin/product-attributes-dialog';
import { ProductLabelsDialog } from '@/components/admin/product-labels-dialog';
import { ProductUnitsDialog } from '@/components/admin/product-units-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { normalizeTags, Product, ProductStatus, ProductType, productsApi } from '@/lib/api/products';
import { branchesApi } from '@/lib/api/settings';
import { categoriesApi } from '@/lib/api/categories';
import { DEFAULT_PRODUCT_SORT, isProductSort, sortProducts, type ProductSort } from '@/lib/product-sort';
import { hasAnyPermission, hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { t } from '@/i18n';

// Price shown in the list: the single price, or the range across active variants
function priceLabel(product: Product, currency: string): string {
  const prices = product.variants
    .filter((v) => v.status !== 'discontinued' && v.price != null)
    .map((v) => Number(v.price));
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatMoney(min, currency)
    : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}

// The chosen order is remembered in this browser
const SORT_KEY = 'pos_products_sort';
const savedSort = (): ProductSort => {
  try {
    const value = localStorage.getItem(SORT_KEY);
    return isProductSort(value) ? value : DEFAULT_PRODUCT_SORT;
  } catch {
    return DEFAULT_PRODUCT_SORT;
  }
};

const sortLabels: Record<ProductSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  'name-asc': 'Name (A to Z)',
  'name-desc': 'Name (Z to A)',
  'price-asc': 'Price (lowest first)',
  'price-desc': 'Price (highest first)',
  'stock-asc': 'Stock (lowest first)',
  'stock-desc': 'Stock (highest first)',
  'category-asc': 'Category (A to Z)',
  'sku-asc': 'SKU (A to Z)',
  'updated-desc': 'Recently updated',
};

// Stock in the list; products sold without stock (services) have none to show
function stockCell(product: Product) {
  if (product.isStockTracked === false) {
    return (
      <span className="text-gray-400" title={t('Stock not tracked')}>
        —
      </span>
    );
  }
  return product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
}

const statusStyles: Record<ProductStatus, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-yellow-50 text-yellow-700',
  discontinued: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<ProductStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  discontinued: 'Discontinued',
};

const typeLabels: Record<ProductType, string> = {
  simple: 'Simple',
  variable: 'With variants',
  composite: 'Composite',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantsProductId, setVariantsProductId] = useState<string | null>(null);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productType, setProductType] = useState<ProductType | ''>('');
  const [sort, setSort] = useState<ProductSort>(DEFAULT_PRODUCT_SORT);
  // localStorage is read after mount (the server render has no access to it)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSort(savedSort());
  }, []);
  const changeSort = (next: ProductSort) => {
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      /* not remembered: still applied */
    }
  };
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const canExport = useAuthStore((s) => hasPermission(s.user, 'catalog.import'));
  const canManage = useAuthStore((s) => hasPermission(s.user, 'catalog.manage'));
  const canPrintLabels = useAuthStore((s) => hasAnyPermission(s.user, 'catalog.manage', 'inventory.receive'));
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => branchesApi.list() });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const tags = normalizeTags(tagFilter).join(',');
  const currency = useCurrency();
  const variantsProduct = products.find((p) => p.id === variantsProductId) ?? null;
  const smallScreen = useSmallScreen();

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await productsApi.list({
        search: search.trim() || undefined,
        status: status || undefined,
        // Products with any of these tags
        tags: tags || undefined,
        branchId: branchId || undefined,
        categoryId: categoryId || undefined,
        productType: productType || undefined,
      });
      setProducts(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load products'));
    } finally {
      setIsLoading(false);
    }
  }, [search, status, tags, branchId, categoryId, productType]);

  const shown = useMemo(() => sortProducts(products, sort), [products, sort]);
  const filtered = !!(search || status || tags || branchId || categoryId || productType);

  // Debounce search typing
  useEffect(() => {
    const timeout = setTimeout(loadProducts, 300);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setExporting(format);
    setError(null);
    try {
      await productsApi.export(format);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not export products'));
    } finally {
      setExporting(null);
    }
  };

  const handleDiscontinue = async (product: Product) => {
    if (!window.confirm(t('Discontinue "{name}"? It will no longer be sold.', { name: product.name.en ?? product.sku }))) {
      return;
    }
    try {
      await productsApi.discontinue(product.id);
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not discontinue product'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Products')}</h1>
          <p className="text-sm text-gray-500">{t('Manage your product catalog.')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canExport && (
            <>
              <Button variant="outline" onClick={() => handleExport('csv')} disabled={!!exporting}>
                <Download className="h-4 w-4" />
                {exporting === 'csv' ? t('Exporting...') : t('Export CSV')}
              </Button>
              <Button variant="outline" onClick={() => handleExport('xlsx')} disabled={!!exporting}>
                <Download className="h-4 w-4" />
                {exporting === 'xlsx' ? t('Exporting...') : t('Export Excel')}
              </Button>
            </>
          )}
          {canPrintLabels && (
            <Button variant="outline" onClick={() => setLabelsOpen(true)}>
              <Printer className="h-4 w-4" />
              {t('Print labels')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" onClick={() => setUnitsOpen(true)}>
              <Ruler className="h-4 w-4" />
              {t('Units')}
            </Button>
          )}
          <Button variant="outline" onClick={() => setAttributesOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            {t('Attributes')}
          </Button>
          <Button onClick={openCreate} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('New product')}
          </Button>
        </div>
      </div>

      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Search by name, SKU or barcode...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-44"
            aria-label={t('Filter by status')}
          >
            <option value="">{t('All statuses')}</option>
            <option value="active">{t('Active')}</option>
            <option value="inactive">{t('Inactive')}</option>
            <option value="discontinued">{t('Discontinued')}</option>
          </select>
          <div className="relative sm:w-56">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('Tags (comma-separated)')}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="pl-10"
              aria-label={t('Filter by tags')}
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-48"
              aria-label={t('Filter by category')}
            >
              <option value="">{t('All categories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {text(category.name)}
                </option>
              ))}
            </select>
          )}
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as ProductType | '')}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-44"
            aria-label={t('Filter by type')}
          >
            <option value="">{t('All types')}</option>
            {(Object.keys(typeLabels) as ProductType[]).map((type) => (
              <option key={type} value={type}>
                {t(typeLabels[type])}
              </option>
            ))}
          </select>
          {branches.length > 1 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm sm:w-48"
              aria-label={t('Filter by branch')}
            >
              <option value="">{t('All branches')}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 sm:ml-auto">
            <ArrowUpDown className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="sr-only">{t('Sort by')}</span>
            <select
              value={sort}
              onChange={(e) => changeSort(e.target.value as ProductSort)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-gray-900 shadow-sm sm:w-52"
              aria-label={t('Sort by')}
              data-testid="product-sort"
            >
              {(Object.keys(sortLabels) as ProductSort[]).map((key) => (
                <option key={key} value={key}>
                  {t(sortLabels[key])}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {smallScreen ? (
          // Phones: one card per product instead of a table that scrolls sideways
          <DataCards
            items={shown}
            getKey={(product) => product.id}
            loading={isLoading && products.length === 0}
            loadingText={t('Loading products...')}
            emptyText={
              filtered
                ? t('No products match your filters.')
                : t('No products yet. Create your first one.')
            }
          >
            {(product) => (
              <>
                <div className="flex items-start gap-3">
                  {product.primaryImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served from object storage
                    <img
                      src={product.primaryImage.url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-gray-50 text-gray-300">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                  <DataCardHeader
                    className="min-w-0 flex-1"
                    title={product.name.en ?? '—'}
                    subtitle={<span className="font-mono">{product.sku}</span>}
                    badge={
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          statusStyles[product.status]
                        )}
                      >
                        {t(statusLabels[product.status])}
                      </span>
                    }
                  />
                </div>
                {!!product.tags?.length && (
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTagFilter(tag)}
                        className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-700 hover:bg-blue-100"
                        title={t('Show products tagged {tag}', { tag })}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <DataCardFields>
                  <DataCardField label={t('Price')}>{priceLabel(product, currency)}</DataCardField>
                  <DataCardField label={t('Stock')}>
                    {stockCell(product)}
                  </DataCardField>
                  <DataCardField label={t('Category')}>
                    {product.category ? text(product.category.name) : '—'}
                  </DataCardField>
                  <DataCardField label={t('Type')}>{t(typeLabels[product.productType])}</DataCardField>
                  {product.barcode && (
                    <DataCardField label={t('Barcode')} full>
                      <span className="font-mono text-xs">{product.barcode}</span>
                    </DataCardField>
                  )}
                </DataCardFields>
                <DataCardActions>
                  {product.productType !== 'simple' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setVariantsProductId(product.id)}
                      aria-label={t('Variants of {sku}', { sku: product.sku })}
                      title={t('Variants')}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(product)}
                    aria-label={t('Edit {sku}', { sku: product.sku })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {product.status !== 'discontinued' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => handleDiscontinue(product)}
                      aria-label={t('Discontinue {sku}', { sku: product.sku })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </DataCardActions>
              </>
            )}
          </DataCards>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm max-md:min-w-[40rem]">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t('Name')}</th>
                <th className="px-4 py-3 font-medium">{t('SKU')}</th>
                <th className="px-4 py-3 font-medium">{t('Barcode')}</th>
                <th className="px-4 py-3 font-medium">{t('Category')}</th>
                <th className="px-4 py-3 font-medium">{t('Tax')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('Price')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('Stock')}</th>
                <th className="px-4 py-3 font-medium">{t('Type')}</th>
                <th className="px-4 py-3 font-medium">{t('Status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    {t('Loading products...')}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    {filtered
                      ? t('No products match your filters.')
                      : t('No products yet. Create your first one.')}
                  </td>
                </tr>
              ) : (
                shown.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        {product.primaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element -- served from object storage
                          <img
                            src={product.primaryImage.url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-gray-50 text-gray-300">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span>{product.name.en ?? '—'}</span>
                          {!!product.tags?.length && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.tags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setTagFilter(tag)}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-700 hover:bg-blue-100"
                                  title={t('Show products tagged {tag}', { tag })}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3 font-mono text-xs">{product.barcode ?? '—'}</td>
                    <td className="px-4 py-3">{product.category ? text(product.category.name) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {product.taxCategory ? text(product.taxCategory.name, product.taxCategory.code) : t('Default')}
                    </td>
                    <td className="px-4 py-3 text-right">{priceLabel(product, currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {stockCell(product)}
                    </td>
                    <td className="px-4 py-3">{t(typeLabels[product.productType])}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          statusStyles[product.status]
                        )}
                      >
                        {t(statusLabels[product.status])}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {product.productType !== 'simple' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setVariantsProductId(product.id)}
                            aria-label={t('Variants of {sku}', { sku: product.sku })}
                            title={t('Variants')}
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(product)}
                          aria-label={t('Edit {sku}', { sku: product.sku })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {product.status !== 'discontinued' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDiscontinue(product)}
                            aria-label={t('Discontinue {sku}', { sku: product.sku })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </Card>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onImagesChanged={loadProducts}
        onSaved={(saved) => {
          loadProducts();
          // New variable products go straight to adding their variants
          if (!editing && saved.productType !== 'simple') {
            setVariantsProductId(saved.id);
          }
        }}
      />

      <ProductAttributesDialog open={attributesOpen} onOpenChange={setAttributesOpen} />
      <ProductUnitsDialog open={unitsOpen} onOpenChange={setUnitsOpen} />
      <ProductLabelsDialog open={labelsOpen} onOpenChange={setLabelsOpen} />

      <ProductVariantsDialog
        product={variantsProduct}
        onOpenChange={(open) => !open && setVariantsProductId(null)}
        onChanged={loadProducts}
      />
    </div>
  );
}

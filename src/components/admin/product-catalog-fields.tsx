'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { branchesApi } from '@/lib/api/settings';
import {
  barcodeFormatLabels,
  checkBarcode,
  MAX_TAGS,
  normalizeTags,
  unitsApi,
} from '@/lib/api/products';
import { t } from '@/i18n';

/**
 * Catalog fields of the product form: tags, unit of measure, branch assortment
 * and the barcode check-digit hint.
 */

// Normalized tag chips; type a tag and press Enter or a comma (also added on blur)
export function ProductTagsInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = (text: string) => {
    if (!text.trim()) return;
    onChange(normalizeTags([...value, ...text.split(',')]));
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={draft}
        placeholder={t('Type a tag and press Enter')}
        disabled={value.length >= MAX_TAGS}
        onChange={(e) => {
          const next = e.target.value;
          // A comma closes the tag being typed
          if (next.includes(',')) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="info" className="gap-1 normal-case">
              {tag}
              <button
                type="button"
                className="rounded-full hover:text-blue-900"
                onClick={() => onChange(value.filter((other) => other !== tag))}
                aria-label={t('Remove tag {tag}', { tag })}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Unit of measure: inactive units are only listed when already chosen
export function ProductUnitSelect({
  id,
  value,
  onChange,
  enabled = true,
  className,
}: {
  id?: string;
  value: string;
  onChange: (unitId: string) => void;
  enabled?: boolean;
  className?: string;
}) {
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.list(),
    enabled,
  });
  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('None (piece)')}</option>
      {units
        .filter((unit) => unit.isActive || unit.id === value)
        .map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name} ({unit.code})
          </option>
        ))}
    </select>
  );
}

// Branches the product is sold at; none ticked = every branch
export function ProductBranchesPicker({
  value,
  onChange,
  enabled = true,
}: {
  value: string[];
  onChange: (branchIds: string[]) => void;
  enabled?: boolean;
}) {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    enabled,
  });
  const toggle = (branchId: string, checked: boolean) =>
    onChange(checked ? [...value, branchId] : value.filter((id) => id !== branchId));

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-gray-400">{t('Loading branches...')}</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {branches.map((branch) => (
            <label key={branch.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={value.includes(branch.id)}
                onChange={(e) => toggle(branch.id, e.target.checked)}
              />
              {branch.name}
              {branch.status === 'inactive' && <span className="text-xs text-gray-400">{t('(inactive)')}</span>}
            </label>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">
        {value.length === 0
          ? t('Sold at every branch. Tick branches to limit where it is sold.')
          : t('Only sold at the ticked branches.')}
      </p>
    </div>
  );
}

// Live check-digit warning under a barcode field (the barcode is still saved)
export function BarcodeCheckHint({ value }: { value: string }) {
  const result = checkBarcode(value);
  if (!result.warning) return null;
  return (
    <p className="text-xs text-amber-700" role="status">
      {t('The check digit of this {format} barcode is wrong: check it for a typo', {
        format: barcodeFormatLabels[result.format],
      })}
    </p>
  );
}

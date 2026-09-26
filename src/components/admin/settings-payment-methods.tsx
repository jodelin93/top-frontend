'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge, statusVariant } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, RowActions, SettingsSection } from '@/components/admin/settings-shared';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { PaymentMethod, paymentMethodsApi, PaymentMethodType } from '@/lib/api/settings';
import { t } from '@/i18n';

const methodTypes: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile', label: 'Mobile payment' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'check', label: 'Check' },
  { value: 'store_credit', label: 'Store credit' },
  { value: 'other', label: 'Other' },
];
const methodTypeLabel = (type: PaymentMethodType) => {
  const label = methodTypes.find((item) => item.value === type)?.label;
  return label ? t(label) : type;
};

const paymentMethodSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required'),
  methodType: z.enum(['cash', 'card', 'mobile', 'bank_transfer', 'check', 'store_credit', 'other']),
  requiresReference: z.boolean(),
  opensDrawer: z.boolean(),
  status: z.enum(['active', 'inactive']),
});

type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

function toFormData(method?: PaymentMethod | null): PaymentMethodFormData {
  return {
    code: method?.code ?? '',
    name: text(method?.name),
    methodType: method?.methodType ?? 'cash',
    requiresReference: method?.requiresReference ?? false,
    opensDrawer: method?.opensDrawer ?? false,
    status: method?.status ?? 'active',
  };
}

function toInput(data: PaymentMethodFormData, method?: PaymentMethod | null): Partial<PaymentMethod> {
  return {
    code: data.code.trim(),
    // Keep other locales intact when editing the English name
    name: { ...method?.name, en: data.name.trim() },
    methodType: data.methodType,
    requiresReference: data.requiresReference,
    opensDrawer: data.opensDrawer,
    ...(method && { status: data.status }),
  };
}

export function SettingsPaymentMethods() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: methods = [], isLoading, error: loadError } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const remove = useMutation({
    mutationFn: (method: PaymentMethod) => paymentMethodsApi.remove(method.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
    onError: (err) => setError(getErrorMessage(err, 'Could not delete payment method')),
  });

  const openDialog = (method: PaymentMethod | null) => {
    setEditing(method);
    setDialogOpen(true);
  };

  const handleDelete = (method: PaymentMethod) => {
    if (!window.confirm(t('Delete payment method "{name}"?', { name: text(method.name, method.code) }))) return;
    setError(null);
    remove.mutate(method);
  };

  return (
    <SettingsSection
      title={t('Payment methods')}
      description={t('Tender types offered at checkout. Inactive methods are hidden from the POS.')}
      action={
        <Button onClick={() => openDialog(null)} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          {t('New payment method')}
        </Button>
      }
    >
      <div className="p-4 pb-0 empty:hidden">
        <ErrorMessage>
          {error ?? (loadError && getErrorMessage(loadError, 'Could not load payment methods'))}
        </ErrorMessage>
      </div>
      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Type')}</Th>
            <Th>{t('Options')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading payment methods...')}</EmptyRow>
          ) : methods.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No payment methods yet.')}</EmptyRow>
          ) : (
            methods.map((method) => (
              <tr key={method.id} className="hover:bg-gray-50">
                <Td className="font-mono text-xs">{method.code}</Td>
                <Td className="font-medium">{text(method.name, '—')}</Td>
                <Td>{methodTypeLabel(method.methodType)}</Td>
                <Td className="text-xs text-gray-600">
                  {[
                    method.opensDrawer && t('Opens drawer'),
                    method.requiresReference && t('Requires reference'),
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Td>
                <Td>
                  <Badge variant={statusVariant(method.status)}>{t(method.status)}</Badge>
                </Td>
                <Td>
                  <RowActions
                    label={method.code}
                    onEdit={() => openDialog(method)}
                    onDelete={() => handleDelete(method)}
                  />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <PaymentMethodFormDialog open={dialogOpen} onOpenChange={setDialogOpen} method={editing} />
    </SettingsSection>
  );
}

function PaymentMethodFormDialog({
  open,
  onOpenChange,
  method,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Payment method to edit; null to create a new one
  method: PaymentMethod | null;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!method;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: toFormData(method),
  });

  useEffect(() => {
    if (open) reset(toFormData(method));
  }, [open, method, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: PaymentMethodFormData) => {
    setError(null);
    try {
      const input = toInput(data, method);
      if (method) {
        await paymentMethodsApi.update(method.id, input);
      } else {
        await paymentMethodsApi.create(input);
      }
      await queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save payment method'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit payment method') : t('New payment method')}</DialogTitle>
          <DialogDescription>{t('How customers can pay at the register.')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Name')} htmlFor="pm-name" error={errorText(errors.name?.message)}>
              <Input id="pm-name" placeholder={t('Cash')} {...register('name')} autoFocus />
            </Field>
            <Field label={t('Code')} htmlFor="pm-code" error={errorText(errors.code?.message)}>
              <Input id="pm-code" placeholder="CASH" {...register('code')} />
            </Field>
            <Field label={t('Type')} htmlFor="pm-type">
              <Select id="pm-type" {...register('methodType')}>
                {methodTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.label)}
                  </option>
                ))}
              </Select>
            </Field>
            {isEdit && (
              <Field label={t('Status')} htmlFor="pm-status">
                <Select id="pm-status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                </Select>
              </Field>
            )}
            <div className="space-y-2 sm:col-span-2">
              <CheckboxField label={t('Opens the cash drawer')} {...register('opensDrawer')} />
              <CheckboxField
                label={t('Requires a reference')}
                hint={t('The cashier must enter e.g. an approval code or transaction ID.')}
                {...register('requiresReference')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? t('Saving...') : isEdit ? t('Save changes') : t('Create payment method')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}

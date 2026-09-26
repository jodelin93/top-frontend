'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import {
  Customer,
  customerFieldsApi,
  customerGroupsApi,
  CustomerInput,
  customerName,
  customersApi,
} from '@/lib/api/customers';
import {
  CustomerCustomFields,
  CustomFieldDraft,
  fromCustomFieldDraft,
  toCustomFieldDraft,
} from '@/components/admin/customer-custom-fields';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { currentLocale, t } from '@/i18n';
import { SAME_REASON_LABELS } from '@/components/admin/customer-duplicates-section';

// zod messages are English; translated when shown
const tr = (message?: string) => (message ? t(message) : undefined);

const customerSchema = z.object({
  code: z.string().trim().max(50),
  customerType: z.enum(['individual', 'business']),
  firstName: z.string().max(255),
  lastName: z.string().max(255),
  companyName: z.string().max(255),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(255)]),
  phone: z.string().max(50),
  taxNumber: z.string().max(100),
  dateOfBirth: z.string(),
  creditLimit: z.string().regex(/^\d*(\.\d{0,2})?$/, 'Must be a positive amount'),
  paymentTermDays: z.string().regex(/^\d{0,4}$/, 'Must be a whole number of days'),
  creditHold: z.boolean(),
  status: z.enum(['active', 'inactive', 'blocked']),
  groupId: z.string(),
  marketingEmailConsent: z.boolean(),
  marketingSmsConsent: z.boolean(),
  consentSource: z.string().max(50),
});

type CustomerFormData = z.infer<typeof customerSchema>;

function toFormData(customer?: Customer | null): CustomerFormData {
  return {
    code: customer?.code ?? '',
    customerType: customer?.customerType ?? 'individual',
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    companyName: customer?.companyName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    taxNumber: customer?.taxNumber ?? '',
    // Date columns may come back as a full timestamp
    dateOfBirth: customer?.dateOfBirth?.slice(0, 10) ?? '',
    // Left out of the API response without customers.finance.view
    creditLimit: customer?.creditLimit != null ? Number(customer.creditLimit).toString() : '',
    paymentTermDays: customer?.paymentTermDays != null ? String(customer.paymentTermDays) : '',
    creditHold: customer?.creditHold ?? false,
    status: customer?.status ?? 'active',
    groupId: customer?.groupId ?? '',
    marketingEmailConsent: customer?.marketingEmailConsent ?? false,
    marketingSmsConsent: customer?.marketingSmsConsent ?? false,
    consentSource: 'admin',
  };
}

// Empty fields are omitted on create and cleared (null) on update
function toInput(data: CustomerFormData, customer?: Customer | null, canManageCredit = false): CustomerInput {
  const empty = customer ? null : undefined;
  const optional = (value: string) => value.trim() || empty;

  return {
    // The backend generates a code (CUST-000001) when none is given
    code: data.code.trim() || undefined,
    customerType: data.customerType,
    firstName: optional(data.firstName),
    lastName: optional(data.lastName),
    companyName: optional(data.companyName),
    email: optional(data.email),
    phone: optional(data.phone),
    taxNumber: optional(data.taxNumber),
    dateOfBirth: data.dateOfBirth || empty,
    // Clearing a known limit resets it to 0; a hidden one is left as it is
    creditLimit:
      data.creditLimit === '' ? (customer?.creditLimit != null ? 0 : undefined) : Number(data.creditLimit),
    ...(customer && { status: data.status }),
    // Credit hold and payment terms need customers.credit.manage (left alone otherwise)
    ...(canManageCredit && {
      paymentTermDays: data.paymentTermDays === '' ? null : Number(data.paymentTermDays),
      creditHold: data.creditHold,
    }),
    groupId: data.groupId || empty,
    marketingEmailConsent: data.marketingEmailConsent,
    marketingSmsConsent: data.marketingSmsConsent,
    consentSource: data.consentSource.trim() || 'admin',
  };
}

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Customer to edit; null to create a new one
  customer: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!customer;
  const canSeeFinance = useAuthStore((s) => hasPermission(s.user, 'customers.finance.view'));
  const canManageCredit = useAuthStore((s) => hasPermission(s.user, 'customers.credit.manage'));
  // Custom field inputs the user changed; the rest show the saved values
  const [customEdits, setCustomEdits] = useState<CustomFieldDraft>({});

  const { data: groups = [] } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => customerGroupsApi.list(),
    enabled: open,
  });
  const { data: fieldDefinitions = [] } = useQuery({
    queryKey: ['customer-fields'],
    queryFn: () => customerFieldsApi.list(),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: toFormData(customer),
  });

  // Also once the groups arrive, so the group select can show the saved value
  const groupsLoaded = groups.length;
  useEffect(() => {
    if (open) {
      reset(toFormData(customer));
    }
  }, [open, customer, reset, groupsLoaded]);

  const customDraft: CustomFieldDraft = {
    ...toCustomFieldDraft(fieldDefinitions, customer?.metadata?.customFields),
    ...customEdits,
  };

  // Warn about likely duplicates while typing (new customers only)
  const [firstName, lastName, email, phone] = useWatch({
    control,
    name: ['firstName', 'lastName', 'email', 'phone'],
  });
  const [lookup, setLookup] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  useEffect(() => {
    if (!open || isEdit) return;
    const timeout = setTimeout(
      () => setLookup({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() }),
      400
    );
    return () => clearTimeout(timeout);
  }, [open, isEdit, firstName, lastName, email, phone]);
  const hasLookup = !!(lookup.email || lookup.phone || `${lookup.firstName} ${lookup.lastName}`.trim().length >= 3);
  const { data: duplicates = [] } = useQuery({
    queryKey: ['customer-duplicate-check', lookup],
    queryFn: () =>
      customersApi.duplicateCheck({
        firstName: lookup.firstName || undefined,
        lastName: lookup.lastName || undefined,
        email: lookup.email || undefined,
        phone: lookup.phone || undefined,
      }),
    enabled: open && !isEdit && hasLookup,
  });

  const isBusiness = useWatch({ control, name: 'customerType' }) === 'business';

  const save = useMutation({
    mutationFn: (input: CustomerInput) =>
      customer ? customersApi.update(customer.id, input) : customersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setCustomEdits({});
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: CustomerFormData) => {
    setError(null);
    if (!data.firstName.trim() && !data.lastName.trim() && !data.companyName.trim()) {
      setError(t('Enter a name or a company name'));
      return;
    }
    const custom = fromCustomFieldDraft(fieldDefinitions, customDraft);
    if (custom.errors.length) {
      setError(custom.errors.join('. '));
      return;
    }
    try {
      await save.mutateAsync({
        ...toInput(data, customer, canManageCredit),
        ...(fieldDefinitions.length > 0 && { customFields: custom.values }),
      });
      handleOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save customer'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit customer') : t('New customer')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('Update {name}.', { name: customerName(customer) }) : t('Add a customer to your store.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          {!isEdit && duplicates.length > 0 && (
            <div className="flex gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{t('This customer may already exist:')}</p>
                <ul className="mt-1 space-y-0.5">
                  {duplicates.map(({ customer: match, reasons }) => (
                    <li key={match.id}>
                      {customerName(match)} <span className="font-mono text-xs">({match.code})</span>
                      {match.email ? ` · ${match.email}` : ''}
                      {match.phone ? ` · ${match.phone}` : ''}
                      <span className="text-yellow-700">
                        {' — '}
                        {reasons.map((reason) => t(SAME_REASON_LABELS[reason] ?? reason)).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Type')} htmlFor="customerType">
              <Select id="customerType" {...register('customerType')}>
                <option value="individual">{t('Individual')}</option>
                <option value="business">{t('Business')}</option>
              </Select>
            </Field>
            <Field
              label={t('Code')}
              htmlFor="code"
              error={tr(errors.code?.message)}
              hint={isEdit ? undefined : t('Leave empty to generate one automatically.')}
            >
              <Input id="code" {...register('code')} />
            </Field>

            <Field label={t('First name')} htmlFor="firstName" error={tr(errors.firstName?.message)}>
              <Input id="firstName" {...register('firstName')} autoFocus />
            </Field>
            <Field label={t('Last name')} htmlFor="lastName" error={tr(errors.lastName?.message)}>
              <Input id="lastName" {...register('lastName')} />
            </Field>

            <Field
              label={isBusiness ? t('Company') : t('Company (optional)')}
              htmlFor="companyName"
              error={tr(errors.companyName?.message)}
            >
              <Input id="companyName" {...register('companyName')} />
            </Field>
            <Field label={t('Tax number')} htmlFor="taxNumber" error={tr(errors.taxNumber?.message)}>
              <Input id="taxNumber" {...register('taxNumber')} />
            </Field>

            <Field label={t('Email')} htmlFor="email" error={tr(errors.email?.message)}>
              <Input id="email" type="email" {...register('email')} />
            </Field>
            <Field label={t('Phone')} htmlFor="phone" error={tr(errors.phone?.message)}>
              <Input id="phone" type="tel" {...register('phone')} />
            </Field>

            <Field label={t('Date of birth')} htmlFor="dateOfBirth">
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
            </Field>
            {canSeeFinance && (
              <Field label={t('Credit limit')} htmlFor="creditLimit" error={tr(errors.creditLimit?.message)}>
                <Input id="creditLimit" inputMode="decimal" placeholder="0.00" {...register('creditLimit')} />
              </Field>
            )}
            {canManageCredit && (
              <Field
                label={t('Payment terms (days)')}
                htmlFor="paymentTermDays"
                hint={t("Empty: the group's terms, else 30 days")}
                error={tr(errors.paymentTermDays?.message)}
              >
                <Input id="paymentTermDays" inputMode="numeric" placeholder="30" {...register('paymentTermDays')} />
              </Field>
            )}
            {canManageCredit && (
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register('creditHold')} />
                {t('Credit hold (no new sales on account)')}
              </label>
            )}

            <Field label={t('Group')} htmlFor="groupId">
              <Select id="groupId" {...register('groupId')}>
                <option value="">{t('No group')}</option>
                {groups
                  .filter((g) => g.isActive || g.id === customer?.groupId)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <CustomerCustomFields definitions={fieldDefinitions} draft={customDraft} onChange={setCustomEdits} />

            <fieldset className="space-y-2 rounded-md border p-3 sm:col-span-2">
              <legend className="px-1 text-sm font-medium">{t('Marketing consent')}</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" {...register('marketingEmailConsent')} />
                  {t('Agrees to marketing emails')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" {...register('marketingSmsConsent')} />
                  {t('Agrees to marketing SMS')}
                </label>
              </div>
              <Field
                label={t('How was consent given?')}
                htmlFor="consentSource"
                hint={t('Recorded in the consent history when a choice changes, e.g. in store, paper form, phone.')}
              >
                <Input id="consentSource" {...register('consentSource')} />
              </Field>
              {customer?.consentUpdatedAt && (
                <p className="text-xs text-gray-500">
                  {t('Last changed {date}', { date: new Date(customer.consentUpdatedAt).toLocaleString(currentLocale()) })}
                  {customer.consentSource ? ` (${customer.consentSource})` : ''}
                </p>
              )}
            </fieldset>

            {isEdit && (
              <Field label={t('Status')} htmlFor="status">
                <Select id="status" {...register('status')}>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="blocked">{t('Blocked')}</option>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : isEdit ? t('Save changes') : t('Create customer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { SupplierProductsDialog } from '@/components/admin/purchasing-supplier-products';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { t } from '@/i18n';
import { Supplier, SupplierContact, SupplierInput, SupplierStatus, suppliersApi } from '@/lib/api/purchasing';

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersApi.list() });
}

/**
 * Supplier list with create / edit / delete
 */
export function SuppliersTab() {
  const queryClient = useQueryClient();
  const canManage = hasPermission(
    useAuthStore((s) => s.user),
    'purchasing.manage'
  );
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const [productsOf, setProductsOf] = useState<Supplier | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onMutate: () => setActionError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (err) => setActionError(getErrorMessage(err, 'Could not delete the supplier')),
  });

  const term = search.trim().toLowerCase();
  const rows = term
    ? suppliers.filter((s) =>
        [s.code, s.name, s.email ?? '', ...s.contacts.map((c) => c.name)].some((v) => v.toLowerCase().includes(term))
      )
    : suppliers;

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('Search suppliers...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManage && (
          <Button onClick={() => setEditing('new')} className="bg-blue-600 text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            {t('New supplier')}
          </Button>
        )}
      </div>

      {(error || actionError) && (
        <div className="m-4">
          <ErrorMessage>{actionError ?? getErrorMessage(error, 'Could not load suppliers')}</ErrorMessage>
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <Th>{t('Code')}</Th>
            <Th>{t('Name')}</Th>
            <Th>{t('Main contact')}</Th>
            <Th>{t('Terms')}</Th>
            <Th>{t('Currency')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading suppliers...')}</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={7}>{term ? t('No supplier matches your search.') : t('No suppliers yet.')}</EmptyRow>
          ) : (
            rows.map((supplier) => {
              const contact = supplier.contacts[0];
              return (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <Td className="font-mono text-xs">{supplier.code}</Td>
                  <Td className="font-medium">{supplier.name}</Td>
                  <Td className="text-gray-600">
                    {contact ? (
                      <>
                        {contact.name}
                        {contact.role && <span className="text-xs text-gray-400"> · {contact.role}</span>}
                        <div className="text-xs">{contact.email ?? contact.phone ?? ''}</div>
                      </>
                    ) : (
                      (supplier.email ?? '—')
                    )}
                  </Td>
                  <Td>
                    {supplier.paymentTermDays != null ? t('Net {count}', { count: supplier.paymentTermDays }) : '—'}
                    {supplier.leadTimeDays != null && (
                      <div className="text-xs text-gray-500">
                        {t('Lead time {count} d', { count: supplier.leadTimeDays })}
                      </div>
                    )}
                  </Td>
                  <Td>{supplier.currencyCode ?? '—'}</Td>
                  <Td>
                    <Badge variant={statusVariant(supplier.status)}>{t(supplier.status)}</Badge>
                  </Td>
                  <Td>
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setProductsOf(supplier)}
                          title={t('Supplier codes, costs and minimum order quantities')}
                        >
                          <PackageSearch className="h-4 w-4" />
                          {t('Products')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(supplier)}>
                          {t('Edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          aria-label={t('Delete {name}', { name: supplier.name })}
                          onClick={() =>
                            window.confirm(t('Delete supplier {name}?', { name: supplier.name })) && remove.mutate(supplier.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>

      {editing && <SupplierFormDialog supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {productsOf && <SupplierProductsDialog supplier={productsOf} onClose={() => setProductsOf(null)} />}
    </Card>
  );
}

const emptyContact = (): SupplierContact => ({ name: '', email: '', phone: '', role: '' });

function SupplierFormDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!supplier;
  const [form, setForm] = useState({
    code: supplier?.code ?? '',
    name: supplier?.name ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    addressLine1: supplier?.addressLine1 ?? '',
    city: supplier?.city ?? '',
    postalCode: supplier?.postalCode ?? '',
    countryCode: supplier?.countryCode ?? '',
    taxNumber: supplier?.taxNumber ?? '',
    paymentTermDays: supplier?.paymentTermDays != null ? String(supplier.paymentTermDays) : '',
    leadTimeDays: supplier?.leadTimeDays != null ? String(supplier.leadTimeDays) : '',
    currencyCode: supplier?.currencyCode ?? '',
    notes: supplier?.notes ?? '',
    status: supplier?.status ?? ('active' as SupplierStatus),
  });
  const [contacts, setContacts] = useState<SupplierContact[]>(supplier?.contacts ?? []);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: (input: SupplierInput) =>
      supplier ? suppliersApi.update(supplier.id, input) : suppliersApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the supplier')),
  });

  // Empty optional fields: omitted on create, cleared on update
  const optional = (value: string) => (value.trim() ? value.trim() : isEdit ? null : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.code.trim() || !form.name.trim()) return setError(t('Code and name are required.'));
    const terms = form.paymentTermDays.trim();
    if (terms && !/^\d+$/.test(terms)) return setError(t('Payment terms must be a whole number of days.'));
    const lead = form.leadTimeDays.trim();
    if (lead && (!/^\d+$/.test(lead) || Number(lead) > 365)) {
      return setError(t('Lead time must be a whole number of days (up to 365).'));
    }
    const cleanContacts = contacts
      .filter((c) => c.name.trim() || c.email?.trim() || c.phone?.trim())
      .map((c) => ({
        name: c.name.trim(),
        ...(c.email?.trim() && { email: c.email.trim() }),
        ...(c.phone?.trim() && { phone: c.phone.trim() }),
        ...(c.role?.trim() && { role: c.role.trim() }),
      }));
    if (cleanContacts.some((c) => !c.name)) return setError(t('Every contact needs a name.'));
    save.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      email: optional(form.email),
      phone: optional(form.phone),
      addressLine1: optional(form.addressLine1),
      city: optional(form.city),
      postalCode: optional(form.postalCode),
      countryCode: optional(form.countryCode),
      taxNumber: optional(form.taxNumber),
      paymentTermDays: terms ? Number(terms) : isEdit ? null : undefined,
      leadTimeDays: lead ? Number(lead) : isEdit ? null : undefined,
      currencyCode: optional(form.currencyCode),
      notes: optional(form.notes),
      contacts: cleanContacts,
      status: form.status,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('Edit {name}', { name: supplier.name }) : t('New supplier')}</DialogTitle>
          <DialogDescription>{t('Inactive or blocked suppliers cannot receive new purchase orders.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Code')} htmlFor="supplier-code">
              <Input id="supplier-code" value={form.code} onChange={set('code')} />
            </Field>
            <Field label={t('Name')} htmlFor="supplier-name" className="sm:col-span-2">
              <Input id="supplier-name" value={form.name} onChange={set('name')} />
            </Field>
            <Field label={t('Email')} htmlFor="supplier-email">
              <Input id="supplier-email" type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label={t('Phone')} htmlFor="supplier-phone">
              <Input id="supplier-phone" value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label={t('Tax number')} htmlFor="supplier-tax">
              <Input id="supplier-tax" value={form.taxNumber} onChange={set('taxNumber')} />
            </Field>
            <Field label={t('Payment terms (net days)')} htmlFor="supplier-terms">
              <Input
                id="supplier-terms"
                inputMode="numeric"
                value={form.paymentTermDays}
                onChange={set('paymentTermDays')}
              />
            </Field>
            <Field
              label={t('Lead time (days)')}
              htmlFor="supplier-lead-time"
              hint={t('Sets the expected delivery date of new orders')}
            >
              <Input
                id="supplier-lead-time"
                inputMode="numeric"
                value={form.leadTimeDays}
                onChange={set('leadTimeDays')}
              />
            </Field>
            <Field
              label={t('Currency')}
              htmlFor="supplier-currency"
              hint={t('ISO code, e.g. USD. Empty = store currency')}
            >
              <Input id="supplier-currency" maxLength={3} value={form.currencyCode} onChange={set('currencyCode')} />
            </Field>
            <Field label={t('Status')} htmlFor="supplier-status">
              <Select id="supplier-status" value={form.status} onChange={set('status')}>
                <option value="active">{t('Active')}</option>
                <option value="inactive">{t('Inactive')}</option>
                <option value="blocked">{t('Blocked')}</option>
              </Select>
            </Field>
            <Field label={t('Address')} htmlFor="supplier-address">
              <Input id="supplier-address" value={form.addressLine1} onChange={set('addressLine1')} />
            </Field>
            <Field label={t('City')} htmlFor="supplier-city">
              <Input id="supplier-city" value={form.city} onChange={set('city')} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('Postal code')} htmlFor="supplier-postal">
                <Input id="supplier-postal" value={form.postalCode} onChange={set('postalCode')} />
              </Field>
              <Field label={t('Country')} htmlFor="supplier-country">
                <Input
                  id="supplier-country"
                  maxLength={2}
                  placeholder="US"
                  value={form.countryCode}
                  onChange={set('countryCode')}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('Contacts')}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setContacts((c) => [...c, emptyContact()])}
              >
                <Plus className="h-3 w-3" />
                {t('Add contact')}
              </Button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-400">{t('No contacts yet.')}</p>
            ) : (
              contacts.map((contact, index) => {
                const update = (patch: Partial<SupplierContact>) =>
                  setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
                return (
                  <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_8rem_auto]">
                    <Input
                      placeholder={t('Name')}
                      value={contact.name}
                      onChange={(e) => update({ name: e.target.value })}
                      aria-label={t('Contact name')}
                    />
                    <Input
                      placeholder={t('Email')}
                      value={contact.email ?? ''}
                      onChange={(e) => update({ email: e.target.value })}
                      aria-label={t('Contact email')}
                    />
                    <Input
                      placeholder={t('Phone')}
                      value={contact.phone ?? ''}
                      onChange={(e) => update({ phone: e.target.value })}
                      aria-label={t('Contact phone')}
                    />
                    <Input
                      placeholder={t('Role|contact')}
                      value={contact.role ?? ''}
                      onChange={(e) => update({ role: e.target.value })}
                      aria-label={t('Contact role')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      aria-label={t('Remove contact')}
                      onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <Field label={t('Notes')} htmlFor="supplier-notes">
            <Textarea id="supplier-notes" rows={2} value={form.notes} onChange={set('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Save supplier')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

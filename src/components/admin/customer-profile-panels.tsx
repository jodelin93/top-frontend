'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage } from '@/components/admin/page-header';
import {
  CustomerActivity,
  CustomerAddress,
  CustomerAddressInput,
  CustomerContactInput,
  CustomerNote,
  customerProfileApi,
} from '@/lib/api/customers';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const EMPTY_ADDRESS: CustomerAddressInput = {
  addressType: 'billing',
  label: null,
  line1: '',
  line2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
};

const orNull = (value: string) => value.trim() || null;

/** Billing / shipping addresses and the people to reach at the customer */
export function CustomerAddressesPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = hasPermission(user, 'customers.manage');
  const [address, setAddress] = useState<CustomerAddressInput>(EMPTY_ADDRESS);
  const [contact, setContact] = useState({ name: '', role: '', email: '', phone: '' });

  const { data: addresses = [] } = useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: () => customerProfileApi.addresses(customerId),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['customer-contacts', customerId],
    queryFn: () => customerProfileApi.contacts(customerId),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-addresses', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer-contacts', customerId] });
  };

  const addAddress = useMutation({
    mutationFn: () => customerProfileApi.addAddress(customerId, address),
    onSuccess: () => {
      setAddress(EMPTY_ADDRESS);
      refresh();
    },
  });
  const makeDefault = useMutation({
    mutationFn: (a: CustomerAddress) => customerProfileApi.updateAddress(customerId, a.id, { isDefault: true }),
    onSuccess: refresh,
  });
  const removeAddress = useMutation({
    mutationFn: (id: string) => customerProfileApi.removeAddress(customerId, id),
    onSuccess: refresh,
  });
  const addContact = useMutation({
    mutationFn: () => {
      const input: CustomerContactInput = {
        name: contact.name.trim(),
        role: orNull(contact.role),
        email: orNull(contact.email),
        phone: orNull(contact.phone),
      };
      return customerProfileApi.addContact(customerId, input);
    },
    onSuccess: () => {
      setContact({ name: '', role: '', email: '', phone: '' });
      refresh();
    },
  });
  const removeContact = useMutation({
    mutationFn: (id: string) => customerProfileApi.removeContact(customerId, id),
    onSuccess: refresh,
  });
  const failure = addAddress.error ?? addContact.error ?? removeAddress.error ?? removeContact.error ?? makeDefault.error;

  return (
    <div className="space-y-4 text-sm">
      <ErrorMessage>{failure ? getErrorMessage(failure, 'Could not save') : null}</ErrorMessage>
      <div className="space-y-2">
        <h3 className="font-semibold">{t('Addresses')}</h3>
        {addresses.length === 0 && <p className="text-gray-400">{t('No addresses yet.')}</p>}
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between rounded-md border p-2">
              <span>
                <span className="flex items-center gap-2 font-medium">
                  {a.addressType === 'billing' ? t('Billing') : t('Shipping')}
                  {a.label && <span className="text-gray-500">· {a.label}</span>}
                  {a.isDefault && <Badge variant="success">{t('Default')}</Badge>}
                </span>
                <span className="block whitespace-pre-line text-gray-700">
                  {[a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(' '), [a.state, a.country].filter(Boolean).join(', ')]
                    .filter(Boolean)
                    .join('\n')}
                </span>
              </span>
              {canEdit && (
                <span className="flex gap-1">
                  {!a.isDefault && (
                    <Button variant="ghost" size="sm" onClick={() => makeDefault.mutate(a)}>
                      {t('Make default')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeAddress.mutate(a.id)}
                    aria-label={t('Remove address')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form
            className="grid gap-2 rounded-md border border-dashed p-2 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              addAddress.mutate();
            }}
          >
            <Select
              value={address.addressType}
              onChange={(e) => setAddress({ ...address, addressType: e.target.value as CustomerAddress['addressType'] })}
              aria-label={t('Address type')}
            >
              <option value="billing">{t('Billing')}</option>
              <option value="shipping">{t('Shipping')}</option>
            </Select>
            <Input
              placeholder={t('Address line 1')}
              aria-label={t('Address line 1')}
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              className="sm:col-span-3"
            />
            <Input
              placeholder={t('Address line 2')}
              aria-label={t('Address line 2')}
              value={address.line2 ?? ''}
              onChange={(e) => setAddress({ ...address, line2: orNull(e.target.value) })}
              className="sm:col-span-2"
            />
            <Input
              placeholder={t('City')}
              aria-label={t('City')}
              value={address.city ?? ''}
              onChange={(e) => setAddress({ ...address, city: orNull(e.target.value) })}
            />
            <Input
              placeholder={t('Postal code')}
              aria-label={t('Postal code')}
              value={address.postalCode ?? ''}
              onChange={(e) => setAddress({ ...address, postalCode: orNull(e.target.value) })}
            />
            <Input
              placeholder={t('State / department')}
              aria-label={t('State / department')}
              value={address.state ?? ''}
              onChange={(e) => setAddress({ ...address, state: orNull(e.target.value) })}
            />
            <Input
              placeholder={t('Country')}
              aria-label={t('Country')}
              value={address.country ?? ''}
              onChange={(e) => setAddress({ ...address, country: orNull(e.target.value) })}
            />
            <Input
              placeholder={t('Label (optional)')}
              aria-label={t('Label')}
              value={address.label ?? ''}
              onChange={(e) => setAddress({ ...address, label: orNull(e.target.value) })}
            />
            <Button type="submit" variant="outline" disabled={!address.line1.trim() || addAddress.isPending}>
              {t('Add address')}
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">{t('Contacts')}</h3>
        {contacts.length === 0 && <p className="text-gray-400">{t('No contacts yet.')}</p>}
        <ul className="divide-y rounded-md border">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-2">
              <span>
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-gray-500"> · {c.role}</span>}
                <span className="block text-xs text-gray-500">{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
              </span>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeContact.mutate(c.id)}
                  aria-label={t('Remove contact')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form
            className="grid gap-2 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              addContact.mutate();
            }}
          >
            <Input placeholder={t('Name')} aria-label={t('Name')} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <Input placeholder={t('Role')} aria-label={t('Role')} value={contact.role} onChange={(e) => setContact({ ...contact, role: e.target.value })} />
            <Input placeholder={t('Email')} aria-label={t('Email')} type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <Input type="tel" placeholder={t('Phone')} aria-label={t('Phone')} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <Button type="submit" variant="outline" disabled={!contact.name.trim() || addContact.isPending}>
              {t('Add contact')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Internal notes; "managers only" notes are shown only to users with customers.manage */
export function CustomerNotesPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canDelete = hasPermission(user, 'customers.manage');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<CustomerNote['visibility']>('all');
  const { data: notes = [] } = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: () => customerProfileApi.notes(customerId),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customer-activity', customerId] });
  };
  const add = useMutation({
    mutationFn: () => customerProfileApi.addNote(customerId, { body: body.trim(), visibility }),
    onSuccess: () => {
      setBody('');
      setVisibility('all');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => customerProfileApi.removeNote(customerId, id),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-3 text-sm">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('Internal note (never shown to the customer)')}
          aria-label={t('Note')}
        />
        <div className="flex items-center gap-2">
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as CustomerNote['visibility'])}
            aria-label={t('Who can see it')}
            className="w-56"
          >
            <option value="all">{t('Everyone who can see customers')}</option>
            <option value="managers">{t('Managers only')}</option>
          </Select>
          <Button type="submit" variant="outline" disabled={!body.trim() || add.isPending}>
            {t('Add note')}
          </Button>
        </div>
      </form>
      <ErrorMessage>{add.error || remove.error ? getErrorMessage(add.error ?? remove.error, 'Could not save the note') : null}</ErrorMessage>
      {notes.length === 0 ? (
        <p className="text-gray-400">{t('No notes yet.')}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className={cn('rounded-md border p-2', note.visibility === 'managers' && 'border-amber-300 bg-amber-50')}>
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-line">{note.body}</p>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => remove.mutate(note.id)}
                    aria-label={t('Delete note')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                {formatDateTime(note.createdAt)}
                {note.visibility === 'managers' && (
                  <>
                    · <Lock className="h-3 w-3" /> {t('Managers only')}
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// English labels, translated at render
const KIND_LABELS: Record<CustomerActivity['kind'], string> = {
  sale: 'Sale',
  return: 'Return',
  credit: 'Account',
  loyalty: 'Loyalty points',
  note: 'Note',
  store_credit: 'Store credit',
};

/** Everything that happened with the customer, newest first */
export function CustomerActivityPanel({ customerId }: { customerId: string }) {
  const currency = useCurrency();
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['customer-activity', customerId],
    queryFn: () => customerProfileApi.activity(customerId),
  });
  if (error) return <ErrorMessage>{getErrorMessage(error, 'Could not load the activity')}</ErrorMessage>;
  if (isLoading) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;
  if (items.length === 0) return <p className="text-sm text-gray-400">{t('No activity yet.')}</p>;
  return (
    <ul className="max-h-96 divide-y overflow-y-auto rounded-md border text-sm">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="flex justify-between gap-2 px-3 py-2">
          <span className="min-w-0">
            <span className="font-medium">{t(KIND_LABELS[item.kind] ?? item.kind)}</span>
            {item.reference && <span className="font-mono text-xs"> · {item.reference}</span>}
            <span className="text-gray-500"> · {t(item.label.replace('_', ' '))}</span>
            {item.detail && <span className="block truncate text-xs text-gray-500">{item.detail}</span>}
            <span className="block text-xs text-gray-400">{formatDateTime(item.date)}</span>
          </span>
          {item.amount != null && (
            <span className={cn('shrink-0 text-right', item.amount < 0 ? 'text-green-700' : 'text-gray-900')}>
              {item.kind === 'loyalty'
                ? t('{points} pts', { points: item.amount })
                : formatMoney(item.amount, currency)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

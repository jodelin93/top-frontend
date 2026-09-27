'use client';

import { useQuery } from '@tanstack/react-query';
import { Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { hardwareApi } from '@/lib/hardware/documents-api';
import { formatDateTime } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';
import { BridgeSection, DrawerSection, ScannerSection } from './sections';

// Wording of each capability flag (GET /hardware/capabilities)
const CAPABILITIES: Record<string, string> = {
  receipt_printer: 'Receipt printer (ESC/POS)',
  cash_drawer: 'Cash drawer',
  barcode_scanner: 'Barcode scanner',
  customer_display: 'Customer display',
  usb_printer: 'USB printer',
  scale: 'Scale',
  fiscal_printer: 'Fiscal printer',
  card_terminal: 'Card terminal',
};

/**
 * Hardware of this till (spec §15): pair the print bridge, printers and their
 * status, test print, test the cash drawer, scanner settings and test, customer
 * display, and what the POS supports. Settings here are kept in this browser.
 */
export default function HardwarePage() {
  const { user } = useAuthStore();
  const allowed = hasPermission(user, 'hardware.manage');
  const smallScreen = useSmallScreen();
  const { data: capabilities = [] } = useQuery({ queryKey: ['hardware', 'capabilities'], queryFn: hardwareApi.capabilities, enabled: allowed });
  const { data: tills = [], error: tillsError } = useQuery({
    queryKey: ['hardware', 'status'],
    queryFn: hardwareApi.statuses,
    enabled: allowed,
    refetchInterval: 60_000,
  });

  if (!allowed) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title={t('Hardware')} />
        <ErrorMessage>{t('You need the “Pair the print bridge, test receipt printers and cash drawers” permission to see this page.')}</ErrorMessage>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title={t('Hardware')}
        description={t('Receipt printer, cash drawer, scanner and customer display of this till. These settings are kept in this browser.')}
      />

      <BridgeSection />
      <DrawerSection />
      <ScannerSection />

      <Card className="space-y-2 bg-white p-4">
        <h2 className="font-semibold">{t('Customer display')}</h2>
        <p className="text-sm text-gray-600">
          {t('Open it in a second window on this PC and move it to the screen facing the customer. It shows the cart and the total as you sell.')}
        </p>
        <Button variant="outline" onClick={() => window.open('/customer-display', 'customer-display', 'popup,width=1024,height=768')}>
          <Monitor className="h-4 w-4" />
          {t('Open customer display')}
        </Button>
      </Card>

      <Card className="bg-white p-4">
        <h2 className="mb-2 font-semibold">{t('Supported devices')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {capabilities.map((c) => (
            <li key={c.key} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm" data-testid={`capability-${c.key}`}>
              <div>
                <div className="font-medium">{t(CAPABILITIES[c.key] ?? c.key)}</div>
                <div className="text-xs text-gray-500">{c.via}</div>
              </div>
              <Badge variant={c.supported ? 'success' : 'default'}>{c.supported ? t('Supported') : t('Not supported')}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="bg-white">
        <h2 className="p-4 pb-0 font-semibold">{t('All tills')}</h2>
        <ErrorMessage>{tillsError ? t('Could not load the tills') : null}</ErrorMessage>
        {smallScreen ? (
          // Phones: one card per till instead of a table that scrolls sideways
          <DataCards
            items={tills}
            getKey={(till) => till.deviceId}
            emptyText={t('No till has reported its hardware yet.')}
          >
            {(till) => (
              <>
                <DataCardHeader
                  title={till.deviceName}
                  badge={
                    <Badge variant={till.bridgeReachable ? 'success' : till.bridgePaired ? 'danger' : 'default'}>
                      {till.bridgeReachable ? t('Connected') : till.bridgePaired ? t('Not reachable') : t('Not paired')}
                    </Badge>
                  }
                />
                <DataCardFields>
                  <DataCardField label={t('Printers')} full>
                    {till.printers.length === 0
                      ? '—'
                      : till.printers.map((p) => (
                          <div key={p.id}>
                            {p.name}: {p.online ? t('online') : t('offline')}
                            {p.paper === 'out' ? ` · ${t('paper out')}` : p.paper === 'low' ? ` · ${t('paper low')}` : ''}
                          </div>
                        ))}
                  </DataCardField>
                  <DataCardField label={t('Last report')} full>
                    {formatDateTime(till.reportedAt)}
                  </DataCardField>
                </DataCardFields>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Device')}</Th>
              <Th>{t('Print bridge')}</Th>
              <Th>{t('Printers')}</Th>
              <Th>{t('Last report')}</Th>
            </tr>
          </THead>
          <TBody>
            {tills.length === 0 ? (
              <EmptyRow colSpan={4}>{t('No till has reported its hardware yet.')}</EmptyRow>
            ) : (
              tills.map((till) => (
                <tr key={till.deviceId}>
                  <Td className="font-medium">{till.deviceName}</Td>
                  <Td>
                    <Badge variant={till.bridgeReachable ? 'success' : till.bridgePaired ? 'danger' : 'default'}>
                      {till.bridgeReachable ? t('Connected') : till.bridgePaired ? t('Not reachable') : t('Not paired')}
                    </Badge>
                  </Td>
                  <Td className="text-sm">
                    {till.printers.length === 0
                      ? '—'
                      : till.printers.map((p) => (
                          <div key={p.id}>
                            {p.name}: {p.online ? t('online') : t('offline')}
                            {p.paper === 'out' ? ` · ${t('paper out')}` : p.paper === 'low' ? ` · ${t('paper low')}` : ''}
                          </div>
                        ))}
                  </Td>
                  <Td className="whitespace-nowrap">{formatDateTime(till.reportedAt)}</Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        )}
      </Card>
    </div>
  );
}

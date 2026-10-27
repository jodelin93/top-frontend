'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { DEFAULT_DOWNLOAD_URL } from '@jodaprint/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { hardwareApi } from '@/lib/hardware/documents-api';
import type { ImageMode, PaperWidth } from '@/lib/hardware/escpos';
import {
  agentConfig,
  agentConnection,
  agentPrint,
  agentPrinters,
  getAgentSettings,
  isAgentPrinter,
  resetAgent,
  saveAgentSettings,
  type AgentConfig,
  type AgentInfo,
  type AgentPrinter,
  type AgentSettings,
} from '@/lib/hardware/jodaprint-client';
import { testLabelTspl } from '@/lib/hardware/label-tspl';
import { testPageEscPos } from '@/lib/hardware/receipt-escpos';
import { t } from '@/i18n';
import { randomId } from '@/lib/uuid';

// What the agent answers when it refuses, in words for the person at the till
const agentMessage = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'ORIGIN_NOT_ALLOWED') {
    return t('JodaPrint does not allow this POS address yet. Add it in the JodaPrint dashboard: Developers › Origins & security.');
  }
  if (code === 'SIGNATURE_INVALID') return t('JodaPrint refused the signature: check the signing key set on the POS server.');
  if (code === 'NOT_ACTIVATED') return t('The JodaPrint agent on this computer is not activated yet.');
  if (code === 'AGENT_CERT_UNTRUSTED') return t('The browser does not trust the JodaPrint agent. Reinstall the agent on this computer.');
  return (error as { message?: string } | null)?.message ?? String(error);
};

const selected = (printer: AgentPrinter, settings: AgentSettings) =>
  'alias' in settings.printer ? printer.alias === settings.printer.alias : printer.id === settings.printer.id;

/**
 * JodaPrint agent of this computer: is it there, which printer takes the receipts,
 * test print. The agent prints on the computer's own printers (USB or network).
 */
export function JodaPrintSection() {
  const { data: store } = useStoreSettings();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [printers, setPrinters] = useState<AgentPrinter[]>([]);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    resetAgent();
    const current = getAgentSettings();
    setSettings(current);
    const conf = await agentConfig(undefined, true);
    setConfig(conf);
    const connection = conf.enabled ? await agentConnection() : { info: null, problem: null };
    const agent = connection.info;
    setInfo(agent);
    // "Not found" has its own line below; anything else (address not allowed...) is explained
    setProblem(connection.problem && connection.problem.code !== 'AGENT_NOT_FOUND' ? agentMessage(connection.problem) : null);
    let list: AgentPrinter[] = [];
    if (agent?.orgId) {
      try {
        list = await agentPrinters();
      } catch (err) {
        setError(agentMessage(err));
      }
    }
    setPrinters(list);
    // Tell the back office how this till is doing (ignored when the till is not registered)
    if (agent) {
      hardwareApi
        .report({
          bridgePaired: true,
          bridgeReachable: !!agent.orgId,
          bridgeVersion: `JodaPrint ${agent.version}`,
          printers: list
            .filter((p) => p.kind === 'thermal')
            .map((p) => ({
              id: p.id,
              name: p.alias ? `${p.name} (${p.alias})` : p.name,
              connection: p.connection,
              online: true,
              paper: null,
              coverOpen: null,
              widthMm: p.paper === '58mm' ? 58 : 80,
            })),
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    // Reads localStorage and the local agent: only in the browser, after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const choosePrinter = (printer: AgentPrinter) => {
    saveAgentSettings({
      printer: printer.alias ? { alias: printer.alias } : { id: printer.id },
      ...(printer.paper === '58mm' || printer.paper === '80mm' ? { widthMm: printer.paper === '58mm' ? 58 : 80 } : {}),
    });
    setSettings(getAgentSettings());
  };

  const testPrint = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await agentPrint(testPageEscPos(settings?.widthMm ?? 80, store?.storeName ?? '', settings?.imageMode ?? 'raster'), { commandId: randomId() });
    if (result.status === 'printed') setNotice(t('Test receipt printed.'));
    else setError(t('The printer did not print: {error}', { error: result.error ?? result.status }));
    setBusy(false);
  };

  const chooseLabelPrinter = (id: string) => {
    const printer = printers.find((p) => p.id === id);
    if (!printer) return;
    saveAgentSettings({ labelPrinter: printer.alias ? { alias: printer.alias } : { id: printer.id } });
    setSettings(getAgentSettings());
  };

  const testLabel = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await agentPrint(testLabelTspl(store?.storeName ?? ''), { commandId: randomId(), target: 'label' });
    if (result.status === 'printed') setNotice(t('Test label printed.'));
    else setError(t('The printer did not print: {error}', { error: result.error ?? result.status }));
    setBusy(false);
  };

  const receiptPrinters = printers.filter((p) => p.kind === 'thermal');
  // Label printers are seen as label or document printers (never the receipt ones)
  const labelPrinters = printers.filter((p) => p.kind !== 'thermal');
  const labelPrinter = settings ? labelPrinters.find((p) => isAgentPrinter(p, settings, 'label')) : undefined;
  const ready = !!info?.orgId;

  return (
    <Card className="space-y-3 bg-white p-4" data-testid="jodaprint-section">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('Receipt printer (JodaPrint)')}</h2>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4" />
          {t('Refresh')}
        </Button>
      </div>
      <p className="text-sm text-gray-600">
        {t('JodaPrint is a small program installed on this computer. It prints receipts on the printers of this computer (USB or network) and opens the cash drawer. Without it, receipts open the browser print dialog.')}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{t('Status')}:</span>
        {!config ? (
          <Badge variant="default">{t('Checking...')}</Badge>
        ) : !config.enabled ? (
          <Badge variant="default">{t('Not set up on the POS server')}</Badge>
        ) : problem ? (
          <Badge variant="danger">{t('Refused by the agent')}</Badge>
        ) : !info ? (
          <Badge variant="warning">{t('Not found on this computer')}</Badge>
        ) : !info.orgId ? (
          <Badge variant="warning">{t('Installed, not activated')}</Badge>
        ) : (
          <Badge variant="success">{t('Connected · version {version}', { version: info.version })}</Badge>
        )}
      </div>
      <ErrorMessage>{problem}</ErrorMessage>
      {config?.enabled && !info && !problem && (
        <p className="text-sm text-gray-600">
          {t('Install and start the JodaPrint agent on this computer, then click Refresh.')}{' '}
          <a href={DEFAULT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline">
            {t('Download JodaPrint')}
          </a>
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {notice && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      {ready && settings && (
        <>
          <div className="space-y-2">
            {receiptPrinters.length === 0 && !error && (
              <p className="text-sm text-gray-500">{t('No receipt printer found by JodaPrint on this computer.')}</p>
            )}
            {receiptPrinters.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <label className="flex min-w-0 items-center gap-2">
                  <input type="radio" name="jodaprint-printer" checked={selected(p, settings)} onChange={() => choosePrinter(p)} />
                  <span className="font-medium">{p.name}</span>
                  {p.alias && <span className="text-gray-500">{p.alias}</span>}
                </label>
                <span className="flex gap-1">
                  <Badge variant="default">{p.connection}</Badge>
                  {p.isDefault && <Badge variant="default">{t('default')}</Badge>}
                </span>
              </div>
            ))}
            {receiptPrinters.length > 0 && !receiptPrinters.some((p) => selected(p, settings)) && (
              <p className="text-sm text-amber-700">
                {t('Choose the receipt printer, or give one the alias “receipt” in the JodaPrint dashboard.')}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('Paper width')} htmlFor="jodaprint-width">
              <Select
                id="jodaprint-width"
                value={String(settings.widthMm)}
                onChange={(e) => {
                  saveAgentSettings({ widthMm: Number(e.target.value) as PaperWidth });
                  setSettings(getAgentSettings());
                }}
                className="w-28"
              >
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </Select>
            </Field>
            <Field label={t('Logo format')} htmlFor="jodaprint-image-mode">
              <Select
                id="jodaprint-image-mode"
                value={settings.imageMode ?? 'raster'}
                onChange={(e) => {
                  saveAgentSettings({ imageMode: e.target.value as ImageMode });
                  setSettings(getAgentSettings());
                }}
                className="w-56"
              >
                <option value="raster">{t('Standard (most printers)')}</option>
                <option value="column">{t('Column (older printers)')}</option>
              </Select>
            </Field>
            <Button onClick={testPrint} disabled={busy || receiptPrinters.length === 0}>
              <Printer className="h-4 w-4" />
              {t('Print a test receipt')}
            </Button>
          </div>

          <div className="space-y-2 border-t pt-3" data-testid="jodaprint-labels">
            <h3 className="font-medium">{t('Label printer')}</h3>
            <p className="text-sm text-gray-600">
              {t('Product labels (1 × 1 inch) are sent to this printer, without the browser print window. By default: the printer with the alias “label” in the JodaPrint dashboard.')}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t('Label printer')} htmlFor="jodaprint-label-printer">
                <Select
                  id="jodaprint-label-printer"
                  value={labelPrinter?.id ?? ''}
                  onChange={(e) => chooseLabelPrinter(e.target.value)}
                  className="w-72"
                >
                  {!labelPrinter && <option value="">{t('No label printer chosen')}</option>}
                  {labelPrinters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.alias ? `${p.name} (${p.alias})` : p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="outline" onClick={testLabel} disabled={busy || !labelPrinter}>
                <Printer className="h-4 w-4" />
                {t('Print a test label')}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

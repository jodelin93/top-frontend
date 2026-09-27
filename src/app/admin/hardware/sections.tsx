'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Printer, RefreshCw, Unplug, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useStoreSettings } from '@/hooks/use-store-settings';
import {
  BridgeError,
  bridgeHealth,
  bridgePrint,
  bridgeStatus,
  DEFAULT_BRIDGE_URL,
  forgetPairing,
  getPairing,
  pairBridge,
  updatePairing,
  type BridgeHealth,
  type BridgePairing,
  type BridgePrinter,
} from '@/lib/hardware/bridge-client';
import { hardwareApi } from '@/lib/hardware/documents-api';
import { kickDrawer } from '@/lib/hardware/drawer-kick';
import { testPageEscPos } from '@/lib/hardware/receipt-escpos';
import {
  analyzeKeystrokes,
  DEFAULT_SCANNER_CONFIG,
  loadScannerConfig,
  normalizeScannerConfig,
  saveScannerConfig,
  type ScannerConfig,
} from '@/lib/hardware/scanner';
import { t } from '@/i18n';
import { randomId } from '@/lib/uuid';

const bridgeMessage = (error: unknown) => {
  if (error instanceof BridgeError) {
    if (error.code === 'unreachable') return t('The print bridge is not running on this PC.');
    if (error.code === 'wrong_code') return t('Wrong pairing code. Check the code shown by the print bridge.');
    if (error.code === 'pairing_closed') return t('The print bridge is already paired. Restart it with --pair to pair again.');
    if (error.code === 'origin_not_paired' || error.code === 'bad_signature') {
      return t('The print bridge is paired with another POS or browser. Pair it again.');
    }
    return t('Print bridge error: {error}', { error: error.message });
  }
  return error instanceof Error ? error.message : String(error);
};

// ---------------------------------------------------------------------------
// Print bridge: pairing, printers, test print

export function BridgeSection() {
  const { data: settings } = useStoreSettings();
  const [pairing, setPairing] = useState<BridgePairing | null>(null);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [printers, setPrinters] = useState<BridgePrinter[]>([]);
  const [code, setCode] = useState('');
  const [url, setUrl] = useState(DEFAULT_BRIDGE_URL);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const current = getPairing();
    setPairing(current);
    const h = await bridgeHealth(current?.url ?? DEFAULT_BRIDGE_URL, true);
    setHealth(h);
    let list: BridgePrinter[] = [];
    if (current && h?.paired) {
      try {
        list = (await bridgeStatus()).printers;
      } catch (err) {
        setError(bridgeMessage(err));
      }
    }
    setPrinters(list);
    // Tell the back office how this till is doing (ignored when the till is not registered)
    hardwareApi
      .report({
        bridgePaired: !!current,
        bridgeReachable: !!h?.paired && !!current,
        bridgeVersion: h?.version,
        printers: list.map((p) => ({
          id: p.id,
          name: p.name,
          connection: p.connection,
          online: !!p.online,
          paper: p.paper ?? null,
          coverOpen: p.coverOpen ?? null,
          widthMm: p.widthMm,
        })),
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // Reads localStorage and the local bridge: only in the browser, after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const pair = async () => {
    setBusy(true);
    setError(null);
    try {
      await pairBridge(code, url.trim() || DEFAULT_BRIDGE_URL);
      setCode('');
      setNotice(t('Paired. Receipts from this browser now print on the receipt printer.'));
      await refresh();
    } catch (err) {
      setError(bridgeMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const testPrint = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await bridgePrint(testPageEscPos(pairing?.widthMm ?? 80, settings?.storeName ?? ''), {
        commandId: randomId(),
      });
      if (result.status === 'printed') setNotice(t('Test receipt printed.'));
      else setError(t('The printer did not print: {error}', { error: result.error ?? result.status }));
    } catch (err) {
      setError(bridgeMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const choosePrinter = (id: string) => {
    const printer = printers.find((p) => p.id === id);
    updatePairing({ printerId: id, widthMm: printer?.widthMm ?? 80 });
    setPairing(getPairing());
  };

  return (
    <Card className="space-y-3 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t('Receipt printer (print bridge)')}</h2>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4" />
          {t('Refresh')}
        </Button>
      </div>
      <p className="text-sm text-gray-600">
        {t('The print bridge is a small program installed on this PC (see print-bridge/README.md). Without it, receipts open the browser print dialog.')}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{t('Status')}:</span>
        {!health ? (
          <Badge variant="default">{t('Not running')}</Badge>
        ) : pairing && health.paired ? (
          <Badge variant="success">{t('Paired · version {version}', { version: health.version })}</Badge>
        ) : (
          <Badge variant="warning">{t('Running, not paired with this browser')}</Badge>
        )}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {notice && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

      {!pairing || !health?.paired ? (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            pair();
          }}
        >
          <Field label={t('Pairing code')} htmlFor="pairing-code" hint={t('Shown in the print bridge window')}>
            <Input id="pairing-code" inputMode="numeric" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" />
          </Field>
          <Field label={t('Bridge address')} htmlFor="bridge-url">
            <Input id="bridge-url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6}>
            {t('Pair')}
          </Button>
        </form>
      ) : (
        <>
          <div className="space-y-2">
            {printers.length === 0 && <p className="text-sm text-gray-500">{t('No printer set up in the print bridge.')}</p>}
            {printers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="receipt-printer" checked={(pairing.printerId ?? printers[0]?.id) === p.id} onChange={() => choosePrinter(p.id)} />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500">{p.widthMm} mm</span>
                </label>
                <span className="flex gap-1">
                  <Badge variant={p.online ? 'success' : 'danger'}>{p.online ? t('online') : t('offline')}</Badge>
                  {p.paper && (
                    <Badge variant={p.paper === 'ok' ? 'success' : p.paper === 'low' ? 'warning' : 'danger'}>
                      {p.paper === 'ok' ? t('paper OK') : p.paper === 'low' ? t('paper low') : t('paper out')}
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={testPrint} disabled={busy || printers.length === 0}>
              <Printer className="h-4 w-4" />
              {t('Print a test receipt')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!window.confirm(t('Unpair this browser from the print bridge?'))) return;
                forgetPairing();
                refresh();
              }}
            >
              <Unplug className="h-4 w-4" />
              {t('Unpair')}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Cash drawer test

export function DrawerSection() {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    if (!window.confirm(t('Open the cash drawer now? Make sure nobody is standing in front of it.'))) return;
    setBusy(true);
    const outcome = await kickDrawer();
    setBusy(false);
    setResult(
      outcome.opened
        ? t('Drawer pulse sent.')
        : outcome.status === 'no_bridge'
          ? t('Pair the print bridge first: the drawer opens through the receipt printer.')
          : outcome.status === 'unknown'
            ? t('No answer from the printer. Check the drawer before trying again.')
            : t('The drawer did not open: {error}', { error: outcome.error ?? outcome.status })
    );
  };

  return (
    <Card className="space-y-2 bg-white p-4">
      <h2 className="font-semibold">{t('Cash drawer')}</h2>
      <p className="text-sm text-gray-600">
        {t('The drawer is plugged into the receipt printer. Each opening is a single command: it is never repeated automatically.')}
      </p>
      <Button variant="outline" onClick={test} disabled={busy}>
        <Wallet className="h-4 w-4" />
        {t('Test drawer kick')}
      </Button>
      {result && <p className="text-sm">{result}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Scanner settings and test

export function ScannerSection() {
  const [config, setConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [saved, setSaved] = useState(false);
  const [value, setValue] = useState('');
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<{ code: string; gaps: number[]; avgGap: number; maxGap: number; isScan: boolean } | null>(null);
  const timesRef = useRef<number[]>([]);

  useEffect(() => {
    // Per-device settings live in localStorage: read after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadScannerConfig());
  }, []);

  const set = <K extends keyof ScannerConfig>(key: K, v: ScannerConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: v }));
    setSaved(false);
  };

  const finish = () => {
    const analysis = analyzeKeystrokes(timesRef.current, config);
    setLast({ code: value, ...analysis });
    timesRef.current = [];
    setTimes([]);
    setValue('');
  };

  return (
    <Card className="space-y-3 bg-white p-4">
      <h2 className="font-semibold">{t('Barcode scanner')}</h2>
      <p className="text-sm text-gray-600">
        {t('Scanners type the code much faster than a person. These settings tell a scan from typing on this till.')}
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t('Ends with')} htmlFor="scanner-terminator">
          <Select id="scanner-terminator" value={config.terminator} onChange={(e) => set('terminator', e.target.value as ScannerConfig['terminator'])}>
            <option value="enter">{t('Enter')}</option>
            <option value="tab">{t('Tab')}</option>
            <option value="none">{t('Nothing (end of burst)')}</option>
          </Select>
        </Field>
        <Field label={t('Minimum characters')} htmlFor="scanner-min">
          <Input id="scanner-min" type="number" min={1} max={64} value={config.minLength} onChange={(e) => set('minLength', Number(e.target.value))} />
        </Field>
        <Field label={t('Max delay between keys (ms)')} htmlFor="scanner-delay">
          <Input
            id="scanner-delay"
            type="number"
            min={5}
            max={500}
            value={config.maxInterKeyDelayMs}
            onChange={(e) => set('maxInterKeyDelayMs', Number(e.target.value))}
          />
        </Field>
        <Field label={t('Ignore repeat scans within (ms)')} htmlFor="scanner-dup">
          <Input
            id="scanner-dup"
            type="number"
            min={0}
            max={10000}
            value={config.duplicateWindowMs}
            onChange={(e) => set('duplicateWindowMs', Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            const next = normalizeScannerConfig(config);
            saveScannerConfig(next);
            setConfig(next);
            setSaved(true);
          }}
        >
          {t('Save scanner settings')}
        </Button>
        {saved && <span className="text-sm text-green-700">{t('Saved for this till.')}</span>}
      </div>

      <Field label={t('Scanner test')} htmlFor="scanner-test" hint={t('Scan a barcode here, or type to compare.')}>
        <Input
          id="scanner-test"
          value={value}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key.length === 1) {
              timesRef.current = [...timesRef.current, e.timeStamp];
              setTimes(timesRef.current);
            } else if ((e.key === 'Enter' && config.terminator === 'enter') || (e.key === 'Tab' && config.terminator === 'tab')) {
              e.preventDefault();
              finish();
            }
          }}
          onBlur={() => config.terminator === 'none' && value && finish()}
        />
      </Field>
      {times.length > 1 && <p className="text-xs text-gray-500">{t('{count} keys so far', { count: times.length })}</p>}
      {last && (
        <div className="rounded-md border p-2 text-sm" data-testid="scanner-result">
          <div className="flex items-center gap-2">
            <span className="font-mono">{last.code || '—'}</span>
            <Badge variant={last.isScan ? 'success' : 'default'}>{last.isScan ? t('Scanner') : t('Typed')}</Badge>
          </div>
          <div className="text-xs text-gray-500">
            {t('Average {avg} ms, slowest {max} ms between keys', { avg: last.avgGap, max: last.maxGap })}
          </div>
          {last.gaps.length > 0 && <div className="mt-1 font-mono text-xs text-gray-500">{last.gaps.join(' · ')}</div>}
        </div>
      )}
    </Card>
  );
}

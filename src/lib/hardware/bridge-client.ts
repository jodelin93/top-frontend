/**
 * Client for the local print bridge (print-bridge/, http://127.0.0.1:17777).
 *
 * Pairing: the bridge shows a 6-digit code; POST /pair with it returns a secret
 * the bridge also keeps, bound to this site's origin. Every later request is
 * signed: HMAC-SHA256(secret, `${timestamp}\n${METHOD}\n${path}\n${sha256hex(body)}`)
 * in X-Bridge-Signature, with X-Bridge-Timestamp (ms). The pairing is stored per
 * browser (localStorage), i.e. per till.
 */
import type { PaperWidth } from './escpos';
import { toBase64 } from './escpos';
import { hmacSha256Hex, sha256Hex as syncSha256Hex } from '@/lib/pos/payload-hash';

export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:17777';
const STORAGE_KEY = 'pos_print_bridge';

export interface BridgePrinter {
  id: string;
  name: string;
  connection: string;
  widthMm: PaperWidth;
  online?: boolean | null;
  paper?: 'ok' | 'low' | 'out' | null;
  coverOpen?: boolean | null;
}

export interface BridgePairing {
  url: string;
  secret: string;
  origin: string;
  // Printer receipts go to (null: the bridge's first printer)
  printerId: string | null;
  widthMm: PaperWidth;
  pairedAt: string;
}

export interface BridgeHealth {
  ok: boolean;
  version: string;
  paired: boolean;
  pairingOpen: boolean;
}

// printed: done; failed: nothing sent (safe to print again); unknown: may have printed
export type BridgeOutcome = 'printed' | 'failed' | 'unknown';

export interface BridgeResult {
  status: BridgeOutcome;
  error: string | null;
  printerId?: string;
  duplicate?: boolean;
}

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Pairing storage (per browser)

export function getPairing(): BridgePairing | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BridgePairing) : null;
  } catch {
    return null;
  }
}

export function savePairing(pairing: BridgePairing) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pairing));
}

export function forgetPairing() {
  localStorage.removeItem(STORAGE_KEY);
  healthCache = null;
}

export function updatePairing(changes: Partial<Pick<BridgePairing, 'printerId' | 'widthMm'>>) {
  const current = getPairing();
  if (current) savePairing({ ...current, ...changes });
}

// ---------------------------------------------------------------------------
// Signing (Web Crypto)

const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

// crypto.subtle only exists in secure contexts (https, localhost): a till that
// opens the app on a plain-http LAN address signs with the built-in SHA-256.
const subtle = (): SubtleCrypto | undefined =>
  typeof crypto !== 'undefined' ? crypto.subtle : undefined;

export async function sha256Hex(text: string): Promise<string> {
  const webCrypto = subtle();
  if (!webCrypto) return syncSha256Hex(text);
  return hex(await webCrypto.digest('SHA-256', new TextEncoder().encode(text)));
}

export async function bridgeSignature(secret: string, timestamp: string, method: string, path: string, body: string) {
  const canonical = `${timestamp}\n${method.toUpperCase()}\n${path}\n${await sha256Hex(body)}`;
  const webCrypto = subtle();
  if (!webCrypto) return hmacSha256Hex(secret, canonical);
  const key = await webCrypto.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return hex(await webCrypto.sign('HMAC', key, new TextEncoder().encode(canonical)));
}

async function call<T>(url: string, method: string, path: string, body?: unknown, secret?: string, timeoutMs = 8000): Promise<T> {
  const raw = body === undefined ? '' : JSON.stringify(body);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    const timestamp = String(Date.now());
    headers['X-Bridge-Timestamp'] = timestamp;
    headers['X-Bridge-Signature'] = await bridgeSignature(secret, timestamp, method, path, raw);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers,
      body: method === 'GET' ? undefined : raw,
      signal: controller.signal,
      // The bridge is on this PC; Chrome asks for the private network permission
      targetAddressSpace: 'loopback',
    } as RequestInit);
  } catch (error) {
    // Timed out: the bridge may have received it. Otherwise it never got there.
    if ((error as Error)?.name === 'AbortError') throw new BridgeError('The print bridge did not answer in time', 'timeout');
    throw new BridgeError('The print bridge is not reachable', 'unreachable');
  } finally {
    clearTimeout(timer);
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new BridgeError(data.error ?? `HTTP ${response.status}`, data.error ?? 'http', response.status);
  return data;
}

// ---------------------------------------------------------------------------

let healthCache: { at: number; value: BridgeHealth | null } | null = null;

/** Is a bridge running on this PC? (cached 10 s; null when not reachable) */
export async function bridgeHealth(url = getPairing()?.url ?? DEFAULT_BRIDGE_URL, fresh = false): Promise<BridgeHealth | null> {
  if (!fresh && healthCache && Date.now() - healthCache.at < 10_000) return healthCache.value;
  const value = await call<BridgeHealth>(url, 'GET', '/health', undefined, undefined, 1500).catch(() => null);
  healthCache = { at: Date.now(), value };
  return value;
}

/** Paired and answering: receipts go to the bridge instead of the print dialog */
export async function isBridgeAvailable(): Promise<boolean> {
  const pairing = getPairing();
  if (!pairing) return false;
  const health = await bridgeHealth(pairing.url);
  return !!health?.paired;
}

export async function pairBridge(code: string, url = DEFAULT_BRIDGE_URL): Promise<BridgePairing> {
  const result = await call<{ secret: string; origin: string; printers: BridgePrinter[] }>(url, 'POST', '/pair', {
    code: code.replace(/\D/g, ''),
  });
  const first = result.printers[0];
  const pairing: BridgePairing = {
    url,
    secret: result.secret,
    origin: result.origin,
    printerId: first?.id ?? null,
    widthMm: first?.widthMm ?? 80,
    pairedAt: new Date().toISOString(),
  };
  savePairing(pairing);
  healthCache = null;
  return pairing;
}

function requirePairing(): BridgePairing {
  const pairing = getPairing();
  if (!pairing) throw new BridgeError('The print bridge is not paired', 'not_paired');
  return pairing;
}

export async function bridgeStatus(): Promise<{ version: string; printers: BridgePrinter[] }> {
  const pairing = requirePairing();
  return call(pairing.url, 'GET', '/status', undefined, pairing.secret);
}

/**
 * Send ESC/POS bytes. `commandId` makes it idempotent on the bridge: sending the
 * same id again returns the first result without printing twice.
 */
export async function bridgePrint(bytes: Uint8Array, options: { commandId: string; printerId?: string | null }): Promise<BridgeResult> {
  const pairing = requirePairing();
  return call(
    pairing.url,
    'POST',
    '/print',
    { commandId: options.commandId, printerId: options.printerId ?? pairing.printerId ?? undefined, data: toBase64(bytes) },
    pairing.secret,
    20000
  );
}

/**
 * Open the cash drawer once. The bridge refuses a repeated commandId for 10
 * minutes, and nothing here retries: a failed kick is reported, never replayed.
 */
export async function bridgeKick(options: { commandId: string; printerId?: string | null; pin?: 2 | 5 }): Promise<BridgeResult> {
  const pairing = requirePairing();
  return call(
    pairing.url,
    'POST',
    '/drawer',
    { commandId: options.commandId, printerId: options.printerId ?? pairing.printerId ?? undefined, pin: options.pin },
    pairing.secret
  );
}

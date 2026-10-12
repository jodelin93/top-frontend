/**
 * Printing straight to the receipt printer, without the browser print dialog. Two
 * ways, tried in this order:
 *  1. the JodaPrint agent on this computer (USB and network printers);
 *  2. the older print bridge, when this browser is paired with one (network printers).
 * When neither answers, documents go to the browser print dialog.
 */
import { bridgeKick, bridgePrint, getPairing, isBridgeAvailable, type BridgeResult } from './bridge-client';
import type { PaperWidth } from './escpos';
import { agentKick, agentPrint, agentPrinterLabel, getAgentSettings, isAgentAvailable } from './jodaprint-client';

export type DirectChannel = 'agent' | 'bridge';

// The connection found by the last check (printing always checks first)
let lastChannel: DirectChannel | null = null;

export async function directChannel(): Promise<DirectChannel | null> {
  if (await isAgentAvailable().catch(() => false)) lastChannel = 'agent';
  else if (await isBridgeAvailable().catch(() => false)) lastChannel = 'bridge';
  else lastChannel = null;
  return lastChannel;
}

export const isDirectPrintAvailable = async () => (await directChannel()) !== null;

/** Send ESC/POS bytes; `commandId` makes it idempotent (one id prints once) */
export async function directPrint(bytes: Uint8Array, options: { commandId: string }): Promise<BridgeResult> {
  const channel = await directChannel();
  if (channel === 'agent') return agentPrint(bytes, options);
  if (channel === 'bridge') return bridgePrint(bytes, { ...options, printerId: getPairing()?.printerId ?? null });
  return { status: 'failed', error: 'No receipt printer connection' };
}

/** The printer print jobs are recorded with ("jodaprint:receipt", a bridge printer id) */
export async function directPrinterId(): Promise<string | null> {
  const channel = await directChannel();
  if (channel === 'agent') return agentPrinterLabel();
  return channel === 'bridge' ? (getPairing()?.printerId ?? null) : null;
}

/**
 * Paper width of the receipt printer found by the last check (null: none on this
 * till). Synchronous: receipts are laid out right after printing checked the connection.
 */
export function directPaperWidth(): PaperWidth | null {
  if (lastChannel === 'agent') return getAgentSettings().widthMm;
  return lastChannel === 'bridge' ? (getPairing()?.widthMm ?? null) : null;
}

/** Open the cash drawer once; null when this till has no direct connection */
export async function directKick(options: { commandId: string; pin?: 2 | 5 }): Promise<BridgeResult | null> {
  if (await isAgentAvailable().catch(() => false)) return agentKick({ pin: options.pin });
  // A paired bridge gets the command straight away (it answers for itself)
  if (getPairing()) return bridgeKick(options);
  return null;
}

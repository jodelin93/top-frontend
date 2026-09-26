import { BridgeError, bridgeKick, getPairing } from './bridge-client';

export type KickOutcome =
  | { opened: true; status: 'printed' }
  // failed: the pulse never left; unknown: it may have opened; replayed: refused as a repeat
  | { opened: false; status: 'failed' | 'unknown' | 'replayed' | 'no_bridge'; error: string | null };

/**
 * Open the cash drawer through the paired print bridge (pulse on the printer's
 * drawer port). One call = one command id = at most one opening: the bridge
 * refuses a repeated id for 10 minutes and this function never retries. Callers
 * decide (and audit) when the drawer may open; a failed kick is shown to the
 * cashier, who opens the drawer with its key if needed.
 */
export async function kickDrawer(options: { commandId?: string; pin?: 2 | 5 } = {}): Promise<KickOutcome> {
  if (!getPairing()) return { opened: false, status: 'no_bridge', error: null };
  const commandId = options.commandId ?? crypto.randomUUID();
  try {
    const result = await bridgeKick({ commandId, pin: options.pin });
    if (result.status === 'printed') return { opened: true, status: 'printed' };
    return { opened: false, status: result.status, error: result.error };
  } catch (error) {
    if (error instanceof BridgeError && error.code === 'replayed') return { opened: false, status: 'replayed', error: error.message };
    if (error instanceof BridgeError && error.code === 'timeout') return { opened: false, status: 'unknown', error: error.message };
    return { opened: false, status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

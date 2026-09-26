import { kickDrawer as bridgeKickDrawer } from '@/lib/hardware';

export interface DrawerKickResult {
  // false: no hardware connected (no paired print bridge); the cashier opens the drawer by key
  supported: boolean;
  opened: boolean;
  error: string | null;
}

/**
 * Open the cash drawer after the opening was recorded (no-sale, cash sale).
 * Goes through the paired print bridge when there is one; never throws and
 * never retries (one call = at most one pulse).
 */
export async function kickDrawer(commandId?: string): Promise<DrawerKickResult> {
  try {
    const outcome = await bridgeKickDrawer({ commandId });
    if (outcome.opened) return { supported: true, opened: true, error: null };
    if (outcome.status === 'no_bridge') return { supported: false, opened: false, error: null };
    return { supported: true, opened: false, error: outcome.error };
  } catch (error) {
    return { supported: true, opened: false, error: error instanceof Error ? error.message : String(error) };
  }
}

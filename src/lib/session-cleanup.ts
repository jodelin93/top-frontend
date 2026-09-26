import { usePOSStore } from '@/stores/pos-store';
import { offlineCache } from '@/lib/pos/offline-db';

// localStorage keys holding the last signed-in user's work (see the modules using them)
export const POS_CART_KEY = 'pos-cart';
export const STAFF_CACHE_KEY = 'pos-staff';

/** Ask the service worker (public/sw.js) to drop its cached pages / payloads. */
export function clearServiceWorkerCache() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear-runtime-cache' });
  } catch {
    // No service worker (development, unsupported browser)
  }
}

/**
 * Sign-out, or the till was marked lost: remove what the previous user left on
 * this browser - the persisted cart (customer, lines, notes), the cached staff
 * list, the cached POS context, and the service worker's page cache.
 *
 * The offline queue of pending sales (IndexedDB `pendingSales`) and the cached
 * catalog are kept on purpose: queued sales must still reach the server, and the
 * catalog is store data every cashier of this till uses.
 */
export async function clearLocalSessionData(): Promise<void> {
  try {
    usePOSStore.getState().clearCart();
    localStorage.removeItem(POS_CART_KEY);
    localStorage.removeItem(STAFF_CACHE_KEY);
  } catch {
    // Storage unavailable: nothing persisted
  }
  clearServiceWorkerCache();
  try {
    await offlineCache.clearContext();
  } catch {
    // IndexedDB unavailable (private mode, tests): nothing cached
  }
}

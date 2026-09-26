/**
 * Hardware (spec §15): print bridge client, ESC/POS encoding, print jobs, cash
 * drawer, scanner settings, customer display. See print-bridge/README.md.
 */
export { kickDrawer, type KickOutcome } from './drawer-kick';
export {
  bridgeHealth,
  bridgeKick,
  bridgePrint,
  bridgeStatus,
  forgetPairing,
  getPairing,
  isBridgeAvailable,
  pairBridge,
  type BridgePairing,
  type BridgePrinter,
} from './bridge-client';
export { printDocument, retryPrint, type PrintOutcome, type PrintRequest } from './print-manager';
export { receiptToEscPos, testPageEscPos } from './receipt-escpos';
export { documentsApi, hardwareApi, publicReceiptUrl, type PrintJob, type DocumentDelivery } from './documents-api';

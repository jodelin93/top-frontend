/**
 * Hardware (spec §15): JodaPrint agent and print bridge clients, ESC/POS encoding,
 * print jobs, cash drawer, scanner settings, customer display.
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
export {
  agentConfig,
  agentInfo,
  agentKick,
  agentPrint,
  agentPrinters,
  getAgentSettings,
  isAgentAvailable,
  saveAgentSettings,
  type AgentPrinter,
  type AgentSettings,
} from './jodaprint-client';
export { directChannel, directPaperWidth, isDirectPrintAvailable, type DirectChannel } from './direct-print';
export { printDocument, retryPrint, type PrintOutcome, type PrintRequest } from './print-manager';
export { receiptToEscPos, testPageEscPos } from './receipt-escpos';
export { documentsApi, hardwareApi, publicReceiptUrl, type PrintJob, type DocumentDelivery } from './documents-api';

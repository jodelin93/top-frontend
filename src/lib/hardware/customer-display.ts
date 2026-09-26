'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Customer display (spec §15, optional): a second browser window on the same PC,
 * opened on /customer-display and dragged to the customer-facing screen. The POS
 * tab broadcasts its cart through a BroadcastChannel; nothing goes through the
 * server and nothing leaves the PC.
 */
export const CUSTOMER_DISPLAY_CHANNEL = 'pos-customer-display';

export interface DisplayLine {
  key: string;
  name: string;
  quantity: number;
  total: number;
}

export type DisplayMessage =
  | {
      type: 'cart';
      storeName: string;
      currency: string;
      lines: DisplayLine[];
      subtotal: number;
      discount: number;
      tax: number;
      total: number;
    }
  | { type: 'complete'; storeName: string; currency: string; total: number; change: number }
  // The display just opened and asks the POS for the current state
  | { type: 'hello' };

const openChannel = () =>
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);

/** POS side: keeps the customer display in step with `message` */
export function useCustomerDisplayBroadcast(message: DisplayMessage | null) {
  const channel = useRef<BroadcastChannel | null>(null);
  const latest = useRef<DisplayMessage | null>(message);
  const serialized = message ? JSON.stringify(message) : null;

  useEffect(() => {
    const ch = openChannel();
    channel.current = ch;
    if (!ch) return;
    // A display opened later gets the current cart
    ch.onmessage = (event: MessageEvent<DisplayMessage>) => {
      if (event.data?.type === 'hello' && latest.current) ch.postMessage(latest.current);
    };
    return () => {
      ch.close();
      channel.current = null;
    };
  }, []);

  useEffect(() => {
    latest.current = serialized ? (JSON.parse(serialized) as DisplayMessage) : null;
    if (latest.current) channel.current?.postMessage(latest.current);
  }, [serialized]);
}

/** Display side: the last state the POS sent */
export function useCustomerDisplay(): DisplayMessage | null {
  const [message, setMessage] = useState<DisplayMessage | null>(null);
  useEffect(() => {
    const ch = openChannel();
    if (!ch) return;
    ch.onmessage = (event: MessageEvent<DisplayMessage>) => {
      if (event.data && event.data.type !== 'hello') setMessage(event.data);
    };
    ch.postMessage({ type: 'hello' } satisfies DisplayMessage);
    return () => ch.close();
  }, []);
  return message;
}

'use client';

import { useEffect, useRef } from 'react';

export interface PosShortcutHandlers {
  search: () => void;
  customer: () => void;
  hold: () => void;
  discount: () => void;
  heldCarts: () => void;
  charge: () => void;
  help: () => void;
  // Selected cart line
  increase: () => void;
  decrease: () => void;
  remove: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
}

// Shown in the shortcut help (?), in this order
export const POS_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['F2'], label: 'Search products / scan' },
  { keys: ['F4'], label: 'Choose customer' },
  { keys: ['F6'], label: 'Hold the cart' },
  { keys: ['F8'], label: 'Discounts' },
  { keys: ['F9'], label: 'Held carts' },
  { keys: ['F12', 'Ctrl + Enter'], label: 'Charge' },
  { keys: ['↑', '↓'], label: 'Select a cart line' },
  { keys: ['+', '−'], label: 'Change the quantity of the selected line' },
  { keys: ['Delete'], label: 'Remove the selected line' },
  { keys: ['Esc'], label: 'Close the open window' },
  { keys: ['?'], label: 'Show these shortcuts' },
];

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/**
 * Till keyboard shortcuts (R048). Function keys work everywhere on the POS screen;
 * character keys (+, -, ?, Delete, arrows) only when the cashier isn't typing.
 * Disabled while a dialog is open (Esc is handled by the dialog itself).
 */
export function usePosShortcuts(handlers: PosShortcutHandlers, enabled: boolean) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const h = ref.current;
      const fn: Record<string, (() => void) | undefined> = {
        F2: h.search,
        F4: h.customer,
        F6: h.hold,
        F8: h.discount,
        F9: h.heldCarts,
        F12: h.charge,
      };
      const action = fn[event.key];
      if (action) {
        event.preventDefault();
        action();
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        h.charge();
        return;
      }
      if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
      const keys: Record<string, (() => void) | undefined> = {
        '?': h.help,
        '+': h.increase,
        '=': h.increase,
        '-': h.decrease,
        Delete: h.remove,
        ArrowDown: h.selectNext,
        ArrowUp: h.selectPrevious,
      };
      const keyAction = keys[event.key];
      if (keyAction) {
        event.preventDefault();
        keyAction();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}

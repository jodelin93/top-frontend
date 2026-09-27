'use client';

import { useSyncExternalStore } from 'react';

// Same breakpoint as Tailwind's md: below it the till shows products and cart as two views
const SMALL_SCREEN = '(max-width: 767.98px)';

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/**
 * True on phones (narrower than the md breakpoint). Used for what CSS cannot do:
 * not focusing the search box (it would pop the on-screen keyboard after every
 * action) and dropping the keyboard-shortcut hints.
 */
export function useSmallScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SMALL_SCREEN).matches,
    () => false
  );
}

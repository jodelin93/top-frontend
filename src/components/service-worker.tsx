'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker (public/sw.js) in production builds.
 * Skipped in development, where cached assets would fight with hot reloading.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  }, []);

  return null;
}

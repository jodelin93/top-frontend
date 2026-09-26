/*
 * Service worker: lets the POS open and run without a connection.
 *
 * - Build assets (/_next/static, hashed and immutable): cache first.
 * - Pages and RSC payloads: network first, falling back to the last cached copy,
 *   and to the cached POS page for navigations that were never cached.
 * - The API (a different origin) is not touched; the POS itself queues sales
 *   in IndexedDB while offline.
 * - Never cached: requests carrying credentials (Authorization header) and
 *   anything under /api.
 * - On sign-out the page posts { type: 'clear-runtime-cache' }: every cached page
 *   and payload is dropped (build assets are kept, the offline entry pages refetched).
 */
// v2: drops caches written by v1, which had no credential checks
const CACHE = 'modern-pos-v2';
const PRECACHE = ['/pos', '/auth/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  if (event.data?.type === 'clear-runtime-cache') {
    event.waitUntil(clearRuntimeCache());
  }
});

async function clearRuntimeCache() {
  const cache = await caches.open(CACHE);
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter((request) => !new URL(request.url).pathname.startsWith('/_next/static/'))
      .map((request) => cache.delete(request))
  );
  // The offline entry pages hold no user data: fetch them again for the next person
  await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
}

// Requests whose response may be private to the signed-in user
const isPrivateRequest = (request, url) =>
  request.headers.has('Authorization') || url.pathname === '/api' || url.pathname.startsWith('/api/');

// Same-origin successful responses only. Next.js marks its (dynamic) pages
// "private, no-store", but they are app shells without user data - the data comes
// from the API with a bearer token and is never cached here - and the POS needs them
// offline, so that header is not honoured for pages.
const isCacheable = (response) => response.ok && response.type === 'basic';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Not handled at all: the browser does its normal (uncached) fetch
  if (isPrivateRequest(request, url)) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/pos');
      if (fallback) return fallback;
    }
    throw error;
  }
}

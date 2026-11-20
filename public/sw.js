/**
 * DMI College Hostel Management PWA - Service Worker
 * Version: 1.0.0
 */

const CACHE_VERSION = "dmi-hostel-v1.0.0";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/images/dmi-foundations-logo.png",
];

// Patterns that must NEVER be cached by the service worker
const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /\/mock\//,
  /session/,
  /gateQr/,
  /auth/,
  /\?source=pwa/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== "GET") return;

  // 2. Strictly bypass cache for non-GET or dynamic sensitive requests
  if (NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname) || pattern.test(url.search))) {
    return;
  }

  // 3. Navigation requests: Network-first, fallback to /offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match("/offline").then((res) => {
            return res || new Response(
              "<!DOCTYPE html><html><body><h1>You are offline</h1><p>Please check your connection and retry.</p></body></html>",
              { headers: { "Content-Type": "text/html" } }
            );
          });
        })
    );
    return;
  }

  // 4. Static assets (images, fonts, scripts, stylesheets): Stale-while-revalidate
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

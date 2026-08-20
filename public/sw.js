// ============================================================
// LCC MAPSI XXVII 2026 — Service Worker (PWA)
// Strategi: Cache-First untuk aset statis, Network-First untuk Navigasi & API
// ============================================================

const STATIC_CACHE = "lcc-mapsi-static-v4";
const DYNAMIC_CACHE = "lcc-mapsi-dynamic-v4";

// Aset statis yang di-cache saat install
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html",
];

// URL yang tidak boleh di-cache (API Supabase, auth, dsb.)
const NETWORK_ONLY_PATTERNS = [
  /supabase\.co/,
  /\/api\//,
  /\/_next\/webpack-hmr/,
  /chrome-extension/,
];

// ─── Install Event ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate Event ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch Event ─────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET dan network-only patterns
  if (request.method !== "GET") return;
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(request.url))) return;
  if (!request.url.startsWith("http")) return;

  // Next.js _next/static → Cache-First
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Halaman navigasi → Network-First dengan fallback offline
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Aset lain (gambar, font, manifest) → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ─── Strategi Cache ──────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Tidak ada koneksi", { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match("/offline.html");
    return (
      offlinePage ||
      new Response("Tidak ada koneksi internet.", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || fetchPromise;
}

// ─── Push Notifications ──────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "LCC MAPSI";
  const options = {
    body: data.body || "Ada notifikasi baru dari LCC MAPSI.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Buka Aplikasi" },
      { action: "close", title: "Tutup" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open" || !event.action) {
    const url = event.notification.data?.url || "/";
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
    );
  }
});

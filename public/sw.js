/* TapNodd service worker: installable app, offline card, cached pages. */
const V = "ft-v1";
const NO_CACHE = ["/login", "/signup", "/onboarding", "/offline"];
const IMAGES = ["/photo/", "/logo/", "/card/", "/event-img/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.add("/offline")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Sent from the login page so a signed-out device keeps no private pages.
self.addEventListener("message", (e) => {
  if (e.data === "clear") e.waitUntil(caches.delete(V).then(() => caches.open(V)).then((c) => c.add("/offline")));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api")) return;

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) caches.open(V).then((c) => c.put(req, r.clone())); return r; })));
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((r) => {
        if (r.ok && !r.redirected && !NO_CACHE.includes(url.pathname)) caches.open(V).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("/offline"))),
    );
    return;
  }

  if (IMAGES.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) caches.open(V).then((c) => c.put(req, r.clone())); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

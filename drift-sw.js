// Drift King app: keeps the game files cached so the installed app starts fast and survives a flaky connection.
// Pages always try the network first, so updates to the game show up straight away.
const CACHE = 'drift-king-v1';
const CORE = ['drift.html', 'app/drift.webmanifest', 'app/icon-192.png', 'app/icon-512.png'];
const NO_CACHE = /api\.cesium\.com|assets\.ion\.cesium\.com|tile\.googleapis\.com|tiles\.maps\.eox\.at|peerjs|0\.peerjs\.com/;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || NO_CACHE.test(u.href) || !/^https?:$/.test(u.protocol)) return;
  if (r.mode === 'navigate') {// network first for pages
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('drift.html'))));
    return;
  }
  const mine = u.origin === location.origin, lib = /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com|dl\.polyhaven\.org/.test(u.host);
  if (!mine && !lib) return;
  // cached copy straight away, refreshed in the background
  e.respondWith(caches.open(CACHE).then(ca => ca.match(r).then(m => {
    const net = fetch(r).then(res => { if (res.ok) ca.put(r, res.clone()); return res; }).catch(() => m);
    return m || net;
  })));
});

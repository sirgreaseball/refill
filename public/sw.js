// Refill service worker: the app shell works offline; live data never comes from cache.
const SHELL = 'refill-shell-v3'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.hostname.endsWith('supabase.co')) return // bookings are always live
  if (req.mode === 'navigate') {
    // network first, so a new deploy shows at once; the cached shell only when offline
    const shell = url.pathname === '/' || url.pathname === '/index.html'
    e.respondWith(fetch(req).then((res) => { if (shell && res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/', copy)) } return res }).catch(() => caches.match(shell ? '/' : req).then((hit) => hit || caches.match('/'))))
    return
  }
  if (url.origin === location.origin || url.hostname.endsWith('fonts.gstatic.com') || url.hostname.endsWith('fonts.googleapis.com')) {
    // hashed assets and fonts never change under the same URL: cache first
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)) }
      return res
    })))
  }
})

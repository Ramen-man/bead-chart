// Offline cache. All app files are cached together as one versioned set and
// served from that set only, so the page never mixes old and new files.
// To release an update: change VERSION. The browser notices the new sw.js,
// downloads the full new set, then swaps it in.
const VERSION = 'beads-v3';
const FILES = ['./', 'index.html', 'perler.html', 'beads.js', 'chart.js',
               'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))  // bypass HTTP cache
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION)
    .then(c => c.match(e.request, { ignoreSearch: true }))
    .then(hit => hit || fetch(e.request)));
});

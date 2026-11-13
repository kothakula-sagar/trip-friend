const cacheName = 'trip-friend-1.0.2';
const assets = ['./','./index.html','./app.html','./help.html','./help.js','./app.js','./release.js','./style.css','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets.map(url => new Request(url, {cache:'reload'}))))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('trip-friend-') && key !== cacheName).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.cache === 'no-store') return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error()));
});

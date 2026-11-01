/**
 * Generated worker caches only build-owned app files, after explicit offline opt-in.
 * ignoreVary: module scripts are requested with an Origin header but cached without one; hosts that send
 * "Vary: Origin" (vite preview, many CDNs) would otherwise make every offline lookup miss.
 */
export function offlineWorker(files: string[], version: string) {
  return `const CACHE = 'linkmap-${version}';
const FILES = ${JSON.stringify(files)};
const local = path => new URL(path, self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(local)))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('linkmap-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data === 'activate') self.skipWaiting(); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
 if (event.request.mode === 'navigate') {
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(local('index.html'), { ignoreVary: true }))));
 } else if (FILES.map(local).includes(url.href)) {
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request, { ignoreVary: true }).then(hit => hit || fetch(event.request))));
 }
});`;
}

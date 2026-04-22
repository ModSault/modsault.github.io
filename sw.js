// intercept all network calls. Ensure it only allows those from the current site origin
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith( new Response('ServiceWorker blocked', { status: 200 }) );
    return;
  }

  event.respondWith(fetch(event.request));
});
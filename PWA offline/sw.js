// Define the cache name
const CACHE_NAME = 'employee-catalog-v1';

// List of files to cache
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com'
  // Note: We don't cache manifest.json or sw.js itself.
];

// Install event: fires when the service worker is first installed.
self.addEventListener('install', event => {
  // We use waitUntil to ensure the service worker doesn't move on
  // from the installing phase until it has finished executing this code.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add all the assets we want to cache to the cache.
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: fires for every network request.
self.addEventListener('fetch', event => {
  event.respondWith(
    // caches.match() looks for a match in the cache for the current request.
    caches.match(event.request)
      .then(response => {
        // If a cached response is found, return it.
        if (response) {
          return response;
        }
        // If the request is not in the cache, fetch it from the network.
        return fetch(event.request);
      })
  );
});

// Activate event: fires when the service worker is activated.
// This is a good place to clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If the cache name is not in our whitelist, delete it.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

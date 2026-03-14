const CACHE_NAME = 'songdb-v3';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip caching for APIs, scripts, DevTools, HMR, Firebase, and external auth
    if (
        event.request.headers.get('accept')?.includes('text/event-stream') ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/_next/') ||
        url.pathname.includes('webpack-hmr') ||
        url.pathname.includes('youtube-stream') ||
        url.protocol === 'chrome-extension:' ||
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('googlevideo.com') ||
        url.hostname.includes('accounts.google.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com')
    ) {
        return;
    }

    // For image assets (thumbnails etc) - stale-while-revalidate
    if (
        url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|gif|ico)$/i) ||
        url.hostname.includes('ytimg.com') ||
        url.hostname.includes('googleusercontent.com')
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(event.request);
                
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => null);

                const finalResponse = cachedResponse || await fetchPromise;
                
                if (finalResponse) return finalResponse;

                // Fallback transparent pixel if image fails
                return new Response(
                    '<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg"></svg>',
                    { headers: { 'Content-Type': 'image/svg+xml' } }
                );
            })
        );
        return;
    }

    // Default: network first, fallback to cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                if (event.request.mode === 'navigate') {
                    const fallback = await caches.match('/');
                    if (fallback) return fallback;
                }

                return new Response('Offline — please check your connection', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});

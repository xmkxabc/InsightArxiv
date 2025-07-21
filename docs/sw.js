// Service Worker for InsightArxiv - Offline Support
const CACHE_NAME = 'insightarxiv-v1.0.0';
const STATIC_CACHE_NAME = 'insightarxiv-static-v1.0.0';
const DATA_CACHE_NAME = 'insightarxiv-data-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/json-parser-worker.js',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/index.css'
];

// Files that should be served from cache first (with network fallback)
const CACHE_FIRST_PATHS = [
    '/style.css',
    '/app.js',
    '/json-parser-worker.js'
];

// Files that should be served from network first (with cache fallback)
const NETWORK_FIRST_PATHS = [
    '/data/',
    'database.json'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE_NAME).then(cache => {
                console.log('[SW] Caching static files...');
                return cache.addAll(STATIC_FILES.filter(url => !url.startsWith('http')));
            }),
            // Cache external resources separately
            caches.open(STATIC_CACHE_NAME).then(cache => {
                const externalResources = STATIC_FILES.filter(url => url.startsWith('http'));
                return Promise.all(
                    externalResources.map(url => 
                        fetch(url)
                            .then(response => response.ok ? cache.put(url, response) : Promise.resolve())
                            .catch(() => console.log(`[SW] Failed to cache: ${url}`))
                    )
                );
            })
        ]).then(() => {
            console.log('[SW] Static files cached successfully');
            self.skipWaiting(); // Force activation
        }).catch(error => {
            console.error('[SW] Failed to cache static files:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && 
                        cacheName !== DATA_CACHE_NAME && 
                        cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service worker activated');
            return self.clients.claim(); // Take control of all pages
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Handle different types of requests with appropriate strategies
    if (isStaticFile(url.pathname)) {
        // Cache first strategy for static files
        event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
    } else if (isDataFile(url.pathname)) {
        // Network first strategy for data files
        event.respondWith(networkFirst(request, DATA_CACHE_NAME));
    } else if (url.origin === location.origin) {
        // Stale while revalidate for other same-origin requests
        event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    } else {
        // Network only for external resources (except those we explicitly cache)
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).catch(() => {
                    // Return offline page or fallback for external resources
                    return new Response('Offline - Resource unavailable', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
        );
    }
});

// Cache first strategy - good for static assets
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            fetch(request).then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            }).catch(() => {
                // Ignore network errors for background updates
            });
            
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first strategy failed:', error);
        return new Response('Offline - Resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Network first strategy - good for dynamic data
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // No cache available
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Data unavailable offline'
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale while revalidate strategy - good for general content
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Fetch from network in background
    const networkResponse = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);
    
    // Return cached version immediately if available
    return cachedResponse || networkResponse;
}

// Helper functions
function isStaticFile(pathname) {
    return CACHE_FIRST_PATHS.some(path => pathname.includes(path)) ||
           pathname.endsWith('.css') ||
           pathname.endsWith('.js') ||
           pathname.endsWith('.png') ||
           pathname.endsWith('.jpg') ||
           pathname.endsWith('.svg') ||
           pathname.endsWith('.ico');
}

function isDataFile(pathname) {
    return NETWORK_FIRST_PATHS.some(path => pathname.includes(path)) ||
           pathname.endsWith('.json') ||
           pathname.endsWith('.jsonl');
}

// Message handling for cache management
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Background sync for favorites and user data
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

async function syncFavorites() {
    // Sync favorites data when network is available
    try {
        const savedData = await getStoredUserData();
        if (savedData && savedData.needsSync) {
            // Implement sync logic here if server-side storage is available
            console.log('[SW] Syncing user data...');
            // Mark as synced
            savedData.needsSync = false;
            await saveUserData(savedData);
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

async function getStoredUserData() {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const response = await cache.match('/user-data');
        return response ? await response.json() : null;
    } catch (error) {
        return null;
    }
}

async function saveUserData(data) {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const response = new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put('/user-data', response);
    } catch (error) {
        console.error('[SW] Failed to save user data:', error);
    }
}

// Notification handling (if notifications are implemented)
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open_app') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Error handling
self.addEventListener('error', event => {
    console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker script loaded');
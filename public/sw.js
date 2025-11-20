// Enhanced Service Worker for GoalBee PWA with Offline Capabilities
const CACHE_NAME = 'goalbee-v1.2';
const STATIC_CACHE = 'goalbee-static-v1.2';
const DYNAMIC_CACHE = 'goalbee-dynamic-v1.2';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/image.png',
  '/favicon.ico',
  '/sw.js'
];

// Dynamic routes that should be cached when visited
const DYNAMIC_ROUTES = [
  '/task/'
];

// API routes that should work offline (read-only)
const OFFLINE_API_ROUTES = [
  '/api/auth'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing and caching static assets');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }

  // Handle page navigation and static assets
  event.respondWith(handlePageRequest(event));
});

// Strategy for API requests
async function handleApiRequest(event) {
  const { request } = event;
  
  try {
    // Try network first for API calls
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses for offline use
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('API request failed, trying cache:', request.url);
    
    // For offline scenario, try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For auth API, return a fallback response
    if (request.url.includes('/api/auth')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Offline mode - authentication unavailable'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return generic offline response for other APIs
    return new Response(JSON.stringify({
      error: 'You are offline. Please check your connection.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Strategy for page requests
async function handlePageRequest(event) {
  const { request } = event;
  const url = new URL(request.url);
  
  try {
    // Network first strategy for pages
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, serving from cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // For navigation requests, try to serve cached pages
    if (request.mode === 'navigate') {
      // Try to serve the cached version of the requested page
      const cachedPage = await caches.match(request);
      if (cachedPage) {
        return cachedPage;
      }
      
      // For task pages, try to serve a cached task page template
      if (url.pathname.startsWith('/task/')) {
        // Try to find any cached task page
        const cache = await caches.open(DYNAMIC_CACHE);
        const keys = await cache.keys();
        const taskPage = keys.find(key => key.url.includes('/task/'));
        if (taskPage) {
          const cachedTaskPage = await cache.match(taskPage);
          if (cachedTaskPage) {
            return cachedTaskPage;
          }
        }
      }
      
      // If no cached page found, try to serve the home page
      const cachedHome = await caches.match('/');
      if (cachedHome) {
        return cachedHome;
      }
      
      return createOfflineResponse();
    }
    
    // For other requests, return a generic offline response
    return createOfflineResponse();
  }
}

// Create a generic offline response
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'You are offline. Some features may be unavailable.'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Performing background sync');
  
  // Here you could implement syncing of offline actions
  // For example, syncing task changes made while offline
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Implement your sync logic here
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/image.png',
    badge: '/image.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'close',
        title: 'Close This Notification'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();

  // If close button is clicked, do nothing
  if (event.action === 'close') {
    console.log('Close button clicked - doing nothing');
    return;
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({
      type: 'window',
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event.notification);
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle cache updates from client
  if (event.data && event.data.type === 'CACHE_NEW_PAGE') {
    const { url } = event.data;
    caches.open(DYNAMIC_CACHE).then(cache => {
      fetch(url).then(response => {
        if (response.ok) {
          cache.put(url, response);
        }
      });
    });
  }
});

// Periodic sync for background updates (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-update') {
      event.waitUntil(updateContent());
    }
  });
}

async function updateContent() {
  console.log('Periodic sync: updating content');
  // Implement content update logic here
}

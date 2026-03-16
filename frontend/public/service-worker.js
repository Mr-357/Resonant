const CACHE_NAME = 'resonant-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/App.css',
  '/index.css'
]

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Cache addAll error:', err)
        return Promise.resolve()
      })
    })
  )
})

// Fetch event
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // API requests: network first, fallback to cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request).then(response => {
            return response || new Response('Offline - API unavailable', { status: 503 })
          })
        })
    )
  } else {
    // Static assets: cache first, fallback to network
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response
        }
        return fetch(event.request).then(response => {
          const clonedResponse = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse)
          })
          return response
        })
      })
    )
  }
})

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

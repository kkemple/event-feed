/* global self */

/**
 * When the user navigates to your site,
 * the browser tries to redownload the script file that defined the service worker in the background.
 * If there is even a byte's difference in the service worker file compared to what it currently has,
 * it considers it 'new'.
 */
const { assets } = global.serviceWorkerOption

const CACHE_NAME = 'v0.0.9'

let assetsToCache = [
  ...assets,
  './'
]

assetsToCache = assetsToCache.map(path => new self.URL(path, global.location).toString())

// when the service worker is first added to a computer
self.addEventListener('install', event => {
  // add core files to cache during serviceworker installation
  event.waitUntil(
    global.caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(assetsToCache))
      .catch(error => {
        console.error(error)
        throw error
      })
  )
})

// after the install event
self.addEventListener('activate', (event) => {
  // clean the caches
  event.waitUntil(
    global.caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(cacheName => {
            // delete the caches that are not the current one
            if (cacheName.indexOf(CACHE_NAME) === 0) {
              return null
            } else {
              return global.caches.delete(cacheName)
            }
          })
        )
      )
  )
})

self.addEventListener('message', event => {
  switch (event.data.action) {
    case 'skipWaiting':
      if (self.skipWaiting) {
        self.skipWaiting()
      }
      break
  }
})

self.addEventListener('fetch', event => {
  const requestURL = new self.URL(event.request.url)

  if (requestURL.pathname.indexOf('/socket.io/') > -1) return

  event.respondWith(
    global.caches.match(event.request)
      .then(response => {
        // we have a copy of the response in our cache, so return it
        if (response) return response

        const fetchRequest = event.request.clone()

        return self.fetch(fetchRequest).then(response => {
          let shouldCache = false

          if (response.type === 'basic' && response.status === 200) {
            shouldCache = true
          } else if (response.type === 'opaque') {
            // if response isn't from our origin / doesn't support CORS
            // make sure we only cache images from twitter
            if (requestURL.hostname.indexOf('.twimg.com') > -1) {
              shouldCache = true
            }
          }

          if (shouldCache) {
            const responseToCache = response.clone()

            global.caches.open(CACHE_NAME)
              .then(cache => {
                const cacheRequest = event.request.clone()
                cache.put(cacheRequest, responseToCache)
              })
          }

          return response
        })
      })
  )
})

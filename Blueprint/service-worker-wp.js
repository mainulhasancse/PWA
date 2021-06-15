var CACHE_STATIC_NAME = 'static-v1';
var CACHE_DYNAMIC_NAME = 'dynamic-v1';
var EXCLUDE_URL_CACHING = ['/amp', '/wp-includes', '/admin', '/admin/*', '/manifest.json', '/robots.txt' ,'/wp-login.php', '/service-worker.js', '/.well-known/*'];
var STATIC_FILES = [
'/offline/'
];

self.addEventListener('install', function (event) {
    self.skipWaiting();
    console.log('[Service Worker] Installing Service Worker ...', event);
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
        .then(function (cache) {
            console.log('[Service Worker] Precaching App Shell');
            cache.addAll(STATIC_FILES);
        })
        )
});

self.addEventListener('activate', function (event) {
    console.log('[Service Worker] Activating Service Worker ....', event);
    event.waitUntil(
        caches.keys()
        .then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
                    console.log('[Service Worker] Removing old cache.', key);
                    return caches.delete(key);
                }
            }));
        })
        );
    return self.clients.claim();
});

function avoid_caching (response=null, event=null) {

    if(EXCLUDE_URL_CACHING.includes(event.url)){
        return true;
    }

    // Check if we received a valid response
    if(!response || response.status !== 200 || response.type !== 'basic') {
        return true;
    }

    if(event.method === 'POST' || event.method === 'PUT' || event.method === 'PATCH' || event.method === 'DELETE'){
        return true;
    }

    return false;

}

// cache then network strategy
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.open(CACHE_DYNAMIC_NAME).then(function(cache) {
            return cache.match(event.request).then(function (response) {
                return response || fetch(event.request).then(function(response) {
                    if(avoid_caching(response, event.request) === false){
                        cache.put(event.request, response.clone());
                    }
                    return response;
                });
            });
        }).catch(function(err) {

            return caches.open(CACHE_STATIC_NAME)
            .then(function (cache) {
                return cache.match('/offline/');
            })
        })
    );
});
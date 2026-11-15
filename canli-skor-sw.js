// Skorbord service worker: yalnızca kendi dosyalarını önbelleğe alır, aynı klasördeki başka sayfalara dokunmaz.
var CACHE = 'canli-skor-v2';
var FILES = ['canli-skor.html', 'canli-skor.webmanifest', 'canli-skor-192.png', 'canli-skor-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('canli-skor') < 0) return;
  // Önce ağ, çevrimdışıysa önbellek
  e.respondWith(
    fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return r;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf('canli-skor') >= 0 && 'focus' in list[i]) return list[i].focus();
    }
    return self.clients.openWindow('canli-skor.html');
  }));
});

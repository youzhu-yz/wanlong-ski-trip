// 万龙攻略 Service Worker:导航网络优先(保证拿到新版本),图片等缓存优先(离线可看)
// 缓存名带版本号,每次构建发布后自动作废旧缓存
var CACHE = 'wanlong-v0.1167';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var isNav = e.request.mode === 'navigate' || /\.html?$/.test(u.pathname) || u.pathname === '/' || u.pathname.slice(-1) === '/';
  if(isNav){
    e.respondWith(fetch(e.request).then(function(r){
      var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); });
      return r;
    }).catch(function(){ return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(hit){
    return hit || fetch(e.request).then(function(r){
      if(r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, cp); }); }
      return r;
    });
  }));
});

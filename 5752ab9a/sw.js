// 私有版 Service Worker(priv-6):页面/时间戳请求=网络优先(navigate 4秒超时回缓存);其余=缓存优先秒开+后台拉新。
var CACHE = 'priv-6';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k !== CACHE && caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var key = u.origin + u.pathname;   // 固定键=去时间戳:绕缓存请求不膨胀缓存
  var save = function(r){
    if(r && r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(key, cp); }); }
    return r;
  };
  var cached = function(){ return caches.match(key); };
  if(e.request.mode === 'navigate' || u.search.indexOf('_=') >= 0){   // 页面本体/主动绕缓存:网络优先
    e.respondWith(new Promise(function(resolve){
      var settled = false;
      var fallback = function(){ cached().then(function(h){ resolve(h || Response.error()); }); };
      var timer = e.request.mode === 'navigate' ? setTimeout(function(){
        if(!settled){ settled = true; fallback(); }
      }, 4000) : 0;
      fetch(e.request).then(function(r){
        if(settled){ return; }
        settled = true; if(timer){ clearTimeout(timer); } save(r); resolve(r);
      }).catch(function(){
        if(settled){ return; }
        settled = true; if(timer){ clearTimeout(timer); } fallback();
      });
    }));
    return;
  }
  e.respondWith(cached().then(function(hit){   // 其余(图片等):缓存优先+后台拉新
    var net = fetch(e.request).then(save).catch(function(){ return hit; });
    return hit || net;
  }));
});

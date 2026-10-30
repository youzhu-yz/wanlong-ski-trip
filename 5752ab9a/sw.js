// 私有版 Service Worker。
// 页面(导航请求):网络优先+4秒超时回缓存——壳页内嵌数据副本,必须让新壳页尽快上线,慢网时回退旧壳页(仍能开,⟳可更新)。
// 其他资源:缓存优先秒开+后台拉新;带 ?_= 时间戳的请求=网络强制(⟳等)。
var CACHE = 'priv-5';
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
  var key = u.origin + u.pathname;   // 固定键=去掉 ?_= 时间戳:绕缓存请求不膨胀缓存,回退照样命中
  var save = function(r){
    if(r && r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(key, cp); }); }
    return r;
  };
  var cached = function(){ return caches.match(key); };
  if(e.request.mode === 'navigate'){   // 页面本体:网络优先,4秒超时/失败回缓存
    e.respondWith(new Promise(function(resolve){
      var settled = false;
      var fallback = function(){ cached().then(function(h){ resolve(h || Response.error()); }); };
      var timer = setTimeout(function(){ if(!settled){ settled = true; fallback(); } }, 4000);
      fetch(e.request).then(function(r){
        if(settled){ return; }
        settled = true; clearTimeout(timer); save(r); resolve(r);
      }).catch(function(){
        if(settled){ return; }
        settled = true; clearTimeout(timer); fallback();
      });
    }));
    return;
  }
  if(u.search.indexOf('_=') >= 0){   // 主动绕缓存:网络优先,失败回缓存
    e.respondWith(fetch(e.request).then(save).catch(cached));
    return;
  }
  e.respondWith(cached().then(function(hit){   // 普通:有缓存立即回+后台拉新;无缓存等网络
    var net = fetch(e.request).then(save).catch(function(){ return hit; });
    return hit || net;
  }));
});

// 私有版 Service Worker(priv-7):只缓存子资源(i.b/加密图片)——导航请求完全不拦,
// 页面打开永远直连(webview 冻结 SW 也挂不了导航);子资源缓存优先秒回+后台拉新,带 ?_= 的强网络。
var CACHE = 'priv-7';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k !== CACHE && caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(e.request.mode === 'navigate') return;   // 页面本体不拦:浏览器 HTTP 缓存接管
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  var key = u.origin + u.pathname;   // 固定键=去时间戳:绕缓存请求不膨胀缓存
  var save = function(r){
    if(r && r.ok){ var cp = r.clone(); caches.open(CACHE).then(function(c){ c.put(key, cp); }); }
    return r;
  };
  if(u.search.indexOf('_=') >= 0){   // 主动绕缓存(⟳/解锁):网络优先,失败回缓存
    e.respondWith(fetch(e.request).then(save).catch(function(){ return caches.match(key); }));
    return;
  }
  e.respondWith(caches.match(key).then(function(hit){   // 其余(i.b/图片):缓存优先秒回+后台拉新
    var net = fetch(e.request).then(save).catch(function(){ return hit; });
    return hit || net;
  }));
});

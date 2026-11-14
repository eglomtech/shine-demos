/* Shine Catering service worker: one worker for the customer app and the admin page.
   Pages: network first (always fresh, falls back to the saved copy when offline or slow).
   Images, icons and fonts: saved copy first, refreshed in the background.
   Firebase / Google API calls are never touched. Change CACHE to force a full refresh. */
var CACHE='shine-v1';
var CORE=['./','shine-app.html','admin.html','manifest.webmanifest','admin.webmanifest','images/icon-192.png','images/icon-512.png','images/logo.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){})}));
  }).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
function keep(req,res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res}
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;
  var u=new URL(r.url),fonts=u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com';
  if(u.origin!==location.origin&&!fonts)return;
  if(r.mode==='navigate'){
    e.respondWith(new Promise(function(ok,no){
      var timer=setTimeout(no,4500);
      fetch(r).then(function(res){clearTimeout(timer);ok(keep(r,res))},function(er){clearTimeout(timer);no(er)});
    }).catch(function(){
      return caches.match(r,{ignoreSearch:true}).then(function(m){
        return m||caches.match(u.pathname.indexOf('admin')>-1?'admin.html':'shine-app.html');
      });
    }));
    return;
  }
  e.respondWith(caches.match(r).then(function(hit){
    var net=fetch(r).then(function(res){return keep(r,res)}).catch(function(){return hit});
    return hit||net;
  }));
});

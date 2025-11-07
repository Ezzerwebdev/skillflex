const VERSION='sf-v9';
const SHELL=['/','/index.html','/ui.css','/app.js','/db.js','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)));self.clients.claim();})());});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
if(u.pathname.startsWith('/packs/')||u.pathname.startsWith('/media/')){
e.respondWith((async()=>{const cache=await caches.open(VERSION);const cached=await cache.match(e.request);const net=fetch(e.request).then(r=>{if(r.ok) cache.put(e.request,r.clone());return r;}).catch(()=>null);return cached||net||new Response('{}',{headers:{'Content-Type':'application/json'}});})()); return; }
if(SHELL.includes(u.pathname)) { e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))); return; }
e.respondWith(fetch(e.request).catch(()=>caches.match('/index.html')));
});
/* App-owned shell cache. No user or official IndexedDB data is changed here. */
const scopeUrl=new URL(self.registration.scope);
const prefix='ava-one-time-shell:'+encodeURIComponent(scopeUrl.pathname)+':';
const metaName=prefix+'meta';
const pointerUrl=new URL('__shell_pointer__',scopeUrl).href;
const assets=['index.html','styles.css','src/main.js','src/official-data.mjs','data/official-snapshot.json','manifest.webmanifest','icon.svg'];
const assetUrls=assets.map(x=>new URL(x,scopeUrl).href);
let refreshing;
async function pointer(){const meta=await caches.open(metaName),r=await meta.match(pointerUrl);return r?await r.text():null}
async function refresh(){
 if(refreshing)return refreshing;
 refreshing=(async()=>{
  const responses=await Promise.all(assetUrls.map(url=>fetch(url,{cache:'no-store',credentials:'same-origin'})));
  if(responses.some(r=>!r.ok||r.type==='opaque'))throw Error('Incomplete shell');
  const bodies=await Promise.all(responses.map(r=>r.clone().arrayBuffer()));
  const hashes=await Promise.all(bodies.map(b=>crypto.subtle.digest('SHA-256',b)));
  const revision=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(hashes.flatMap(b=>Array.from(new Uint8Array(b))))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const name=prefix+'v-'+revision,cache=await caches.open(name);
  try{for(let i=0;i<assetUrls.length;i++)await cache.put(assetUrls[i],responses[i]);const meta=await caches.open(metaName);await meta.put(pointerUrl,new Response(name));for(const old of await caches.keys())if(old.startsWith(prefix+'v-')&&old!==name)await caches.delete(old)}catch(e){if(await pointer()!==name)await caches.delete(name);throw e}
 })();try{return await refreshing}finally{refreshing=null}
}
async function cached(url){const name=await pointer();if(!name)return null;return (await caches.open(name)).match(url)}
self.addEventListener('install',event=>event.waitUntil(refresh()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==scopeUrl.origin)return;
 if(req.mode==='navigate'&&url.pathname.startsWith(scopeUrl.pathname)){
  const network=fetch(req);event.waitUntil(network.then(r=>r.ok?refresh():undefined).catch(()=>{}));event.respondWith(network.catch(async()=>await cached(assetUrls[0])||Response.error()));return;
 }
 const canonical=url.origin+url.pathname;if(!assetUrls.includes(canonical))return;
 event.respondWith((async()=>{try{const response=await fetch(req);if(response.ok)return response;throw Error('unavailable')}catch(e){return await cached(canonical)||Response.error()}})());
});

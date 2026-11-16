// Loopback-only test harness. It is not a production server or an auth system.
// The caller keeps the returned session cookie in its own process.
import https from 'node:https';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';

const production='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const assets=new Map([['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/sw.js','sw.js'],['/manifest.webmanifest','manifest.webmanifest'],['/icon.svg','icon.svg'],['/src/main.js','src/main.js'],['/src/official-data.mjs','src/official-data.mjs'],['/data/official-snapshot.json','data/official-snapshot.json']]);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
export async function startStagingGateway({directory,key,cert,getAccessToken,fetcher}={}){
 if(typeof getAccessToken!=='function'||!key||!cert)throw Error('Staging TLS and server-side token provider required');
 const dir=await realpath(directory),tmp=await realpath(tmpdir());
 if(!dir.startsWith(tmp+'/one-time-off-staging-')||dir.slice(tmp.length+1).includes('/'))throw Error('A generated temporary staging build is required');
 for(const f of ['index.html','data/official-snapshot.json','src/official-data.mjs','server/sheets-readonly.mjs'])if(!(await realpath(join(dir,f))).startsWith(dir+'/'))throw Error('Invalid staging file');
 const data=JSON.parse(await readFile(join(dir,'data/official-snapshot.json'),'utf8'));
 const id=data.sourceSpreadsheetId,html=await readFile(join(dir,'index.html'),'utf8');
 if(!/^[A-Za-z0-9_-]{20,128}$/.test(id||'')||id===production||!html.includes('STAGING TEST ONLY'))throw Error('A distinct staging build is required');
 for(const file of ['src/official-data.mjs','server/sheets-readonly.mjs']){const body=await readFile(join(dir,file),'utf8');if(!body.includes(id)||body.includes(production))throw Error('Staging source mismatch')}
 const {officialReadHandler}=await import(pathToFileURL(join(dir,'server/sheets-readonly.mjs')).href);
 const secret=randomBytes(32).toString('hex'),cookie=`staging_session=${secret}`;
 const authorized=req=>{const candidate=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('staging_session='))?.slice('staging_session='.length)||'';return /^[0-9a-f]{64}$/.test(candidate)&&timingSafeEqual(Buffer.from(candidate),Buffer.from(secret))};
 const handler=officialReadHandler({authorize:authorized,getAccessToken,fetcher});
 let port;
 const server=https.createServer({key,cert},async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.host!==`127.0.0.1:${port}`||!authorized(req)){res.statusCode=403;return res.end()}
  const url=new URL(req.url,`https://127.0.0.1:${port}`);
  if(url.pathname==='/official')return handler(req,res);
  if(req.method!=='GET'||!assets.has(url.pathname)){res.statusCode=404;return res.end()}
  try{const relative=assets.get(url.pathname),absolute=await realpath(join(dir,relative));if(!absolute.startsWith(resolve(dir)+'/'))throw Error('invalid path');const data=await readFile(absolute);const ext=relative.slice(relative.lastIndexOf('.'));res.setHeader('Content-Type',types[ext]||'application/octet-stream');return res.end(data)}catch(_){res.statusCode=404;return res.end()}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});port=server.address().port;
 return {origin:`https://127.0.0.1:${port}`,cookie,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}

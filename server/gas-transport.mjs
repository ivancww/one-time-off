// A fixed, server-owned read-only GAS transport. It never forwards browser
// cookies or credentials to Google. No public handler is created here.
const endpoint='https://script.google.com/macros/s/AKfycbz0F4-HP8cp_Gc1Y03YZBEhaYpb-XVGVasFHdh29Kv5mjk9Ng0dROGuOFaMy_1vI1co/exec';
const allowed=new Set(['bootstrap','version','content','financial']);
const maxBytes=1024*1024;
function redirectTarget(value,base){
 const u=new URL(value,base);
 if(u.protocol!=='https:'||u.hostname!=='script.googleusercontent.com'||u.port||u.username||u.password||u.hash||u.pathname!=='/macros/echo')throw Error('Unapproved GAS redirect');
 return u.href;
}
async function readJson(response){
 const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw Error('GAS response too large');
 if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw Error('Invalid GAS content type');
 if(!response.body)throw Error('Empty GAS response');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw Error('GAS response too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function createGasTransport({fetcher=globalThis.fetch,timeoutMs=15000}={}){
 if(typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Invalid transport configuration');
 return async function getAction(action){
  if(!allowed.has(action))throw Error('Unsupported GAS action');
  const first=new URL(endpoint);first.searchParams.set('action',action);let url=first.href;const signal=AbortSignal.timeout(timeoutMs);
  for(let count=0;count<=2;count++){
   const response=await fetcher(url,{method:'GET',headers:{Accept:'application/json'},redirect:'manual',credentials:'omit',signal});
   if([301,302,303,307,308].includes(response.status)){if(count===2)throw Error('Too many GAS redirects');const location=response.headers.get('location');if(!location)throw Error('Missing GAS redirect');url=redirectTarget(location,url);continue}
   if(!response.ok)throw Error('GAS source unavailable');return readJson(response);
  }
  throw Error('GAS source unavailable');
 };
}

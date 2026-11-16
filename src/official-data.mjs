// Official data transport is opt-in: an endpoint must be explicitly approved and
// supplied by the deployment. The bundled snapshot is not a live feed.
const expected=[['year1','1year 4%',0.04],['year3','3year 5%',0.05],['year5','5year 6%',0.06],['rollover','自動滾存',0]];
export function validDataset(value){
 if(!value || value.sourceSpreadsheetId!=='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U' || !Array.isArray(value.plans) || value.plans.length!==4)return false;
 return expected.every(([id,sheet,rate],i)=>{const p=value.plans[i];if(!p || p.id!==id || p.sheet!==sheet || p.rate!==rate || !Array.isArray(p.balances) || !p.balances.length)return false;let last=0;return p.balances.every(row=>{if(!Array.isArray(row)||row.length!==2||!Number.isSafeInteger(row[0])||row[0]<=last||!Number.isFinite(row[1])||row[1]<=0)return false;last=row[0];return true})});
}
export function validEnvelope(value,now=Date.now()){
 if(!value || value.schemaVersion!==1 || typeof value.revision!=='string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(value.revision) || typeof value.publishedAt!=='string')return false;
 const published=Date.parse(value.publishedAt);return Number.isFinite(published) && published<=now && validDataset(value.data);
}
const canonicalPlans=data=>JSON.stringify(data.plans.map(p=>[p.id,p.sheet,p.rate,p.balances]));
// Cache is a performance/offline fallback, not proof of source authenticity.
// Configure an authenticated same-origin backend before enabling live reads.
export async function loadOfficialData({snapshot,endpoint=null,cache=null,fetcher=globalThis.fetch,now}={}){
 if(!validDataset(snapshot))throw Error('Invalid bundled snapshot');
 const clock=()=>now??Date.now();
 let error=null, trusted=false, cached=null;
 if(endpoint){
  try{
   const target=new URL(endpoint,globalThis.location?.href);
   if(!globalThis.location || target.origin!==globalThis.location.origin || target.protocol!=='https:' || target.username || target.password)throw Error('Endpoint must be same-origin HTTPS');trusted=true;
   try{const value=await cache?.read(target.href);if(validEnvelope(value,clock()))cached=value}catch(_){}
   const response=await fetcher(target.href,{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Official source unavailable');
   const data=await response.json();if(!validEnvelope(data,clock()))throw Error('Invalid official response');
   if(cached && (Date.parse(data.publishedAt)<Date.parse(cached.publishedAt) || (data.revision===cached.revision && canonicalPlans(data.data)!==canonicalPlans(cached.data))))throw Error('Conflicting official revision');
   try{await cache?.write(data,target.href)}catch(_){} // a cache failure must not corrupt a valid response
   return {data:data.data,mode:'live',revision:data.revision,publishedAt:data.publishedAt,stale:clock()-Date.parse(data.publishedAt)>7*86400000};
  }catch(e){error=e}
 }
 // Only consider cached live data if this deployment has an approved endpoint.
 if(trusted && cached)return {data:cached.data,mode:'cached',revision:cached.revision,publishedAt:cached.publishedAt,stale:clock()-Date.parse(cached.publishedAt)>7*86400000,error:!!error};
 return {data:snapshot,mode:'snapshot',revision:null,publishedAt:null,error:!!error};
}

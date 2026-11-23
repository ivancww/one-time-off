// Official data transport is opt-in: an endpoint must be explicitly approved and
// supplied by the deployment. The bundled snapshot is not a live feed.
export const expected=[['year5','5year 6%',0.06,5],['year7','7year 6.5%',0.065,7],['year9','9year 7%',0.07,9],['year11','11year 8%',0.08,11],['rollover','自動滾存',0,null]];
export const contentIds=['P1_TITLE','P1_INTRO','P1_HELP','P1_GOAL1','P1_GOAL2','P1_GOAL3','P1_GOAL4','P2_TITLE','P2_AMOUNT','P2_NOTE','P3_TITLE','P3_RATE','P3_YEARS','P3_NOTE','P4_TITLE','P4_SELECT','P5_TITLE','P5_DETAILS','P6_TITLE','P6_YEAR','P7_TITLE','P7_NOTE','P7_PRINT'];
const contentTypes=['標題','段落','段落','選項','選項','選項','選項','標題','欄位名稱','說明','標題','欄位名稱','欄位名稱','說明','標題','欄位名稱','標題','按鈕','標題','欄位名稱','標題','段落','按鈕'];
const disclosurePages=['P3','P4','P5','P5','P6','P7','全部','全部'];
export const disclosureIds=['BANK_SCENARIO','WITHDRAWAL_TERMS','EXACT_YEAR','PAYOUT_NOT_VERIFIED','COMPARISON_NOTE','SUMMARY_NOTE','SOURCE_NOTE','OFFICIAL_USER'];
const textValue=v=>typeof v==='string' && v.trim().length>0 && v.length<=2000;
export function validContent(c){
 if(!c || !Array.isArray(c.pages) || c.pages.length!==7 || !Array.isArray(c.entries) || c.entries.length!==contentIds.length || !Array.isArray(c.disclosures) || c.disclosures.length!==disclosureIds.length)return false;
 return c.pages.every((p,i)=>Array.isArray(p)&&p[0]===`P${i+1}`&&p[1]===i+1&&textValue(p[2])&&p[3]==='是'&&textValue(p[4])) &&
 c.entries.every((r,i)=>Array.isArray(r)&&r[0]===contentIds[i]&&r[1]===r[0].slice(0,2)&&r[2]===contentTypes[i]&&textValue(r[3])) &&
 c.disclosures.every((r,i)=>Array.isArray(r)&&r[0]===disclosureIds[i]&&r[1]===disclosurePages[i]&&textValue(r[2])&&textValue(r[3])&&textValue(r[4]));
}
export function validDataset(value){
 if(!value || (value.content!==undefined && !validContent(value.content)) || value.sourceSpreadsheetId!=='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U' || !Array.isArray(value.plans) || value.plans.length!==5)return false;
 return expected.every(([id,sheet,rate,startYear],i)=>{const p=value.plans[i];if(!p || p.id!==id || p.sheet!==sheet || p.rate!==rate || p.startYear!==startYear || !Array.isArray(p.balances) || !p.balances.length)return false;let last=0;return p.balances.every(row=>{if(!Array.isArray(row)||row.length!==2||!Number.isSafeInteger(row[0])||row[0]<=last||!Number.isFinite(row[1])||row[1]<=0)return false;last=row[0];return true})});
}
export function validEnvelope(value,now=Date.now()){
 if(!value || value.schemaVersion!==1 || typeof value.revision!=='string' || !/^[a-zA-Z0-9._-]{1,128}$/.test(value.revision) || typeof value.publishedAt!=='string')return false;
 const published=Date.parse(value.publishedAt);return Number.isFinite(published) && published<=now && validDataset(value.data);
}
const canonicalPlans=data=>JSON.stringify([data.plans.map(p=>[p.id,p.sheet,p.rate,p.balances]),data.content??null]);
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

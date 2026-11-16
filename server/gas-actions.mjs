// Top-level GAS fields are from the Owner's specification. Nested payload
// shapes and deployment access remain unverified, so mappers are mandatory.
import {createHash} from 'node:crypto';
import {validContent,validDataset} from '../src/official-data.mjs';
const sourceId='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=x=>typeof x==='string'&&x.trim().length>0&&x.length<=256;
const revision=x=>str(x);
const container=x=>!!x&&typeof x==='object';
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const api=x=>(str(x)||(Number.isSafeInteger(x)&&x>0));
function common(x){return object(x)&&x.success===true&&str(x.service)&&api(x.apiVersion)}
export function parseGasBootstrap(x){
 if(!common(x)||!revision(x.contentRevision)||!container(x.financial)||!container(x.officialContent))throw Error('Invalid bootstrap response');
 return {service:x.service,apiVersion:x.apiVersion,contentRevision:x.contentRevision,financial:x.financial,officialContent:x.officialContent};
}
export function parseGasVersion(x){
 if(!common(x)||!revision(x.financialRevision)||!revision(x.contentRevision)||!timestamp(x.checkedAt))throw Error('Invalid version response');
 return {service:x.service,apiVersion:x.apiVersion,financialRevision:x.financialRevision,contentRevision:x.contentRevision,checkedAt:x.checkedAt};
}
export function parseGasContent(x){
 if(!common(x)||!revision(x.revision)||!timestamp(x.readAt)||!container(x.data))throw Error('Invalid content response');
 return {service:x.service,apiVersion:x.apiVersion,revision:x.revision,readAt:x.readAt,data:x.data};
}
export function parseGasFinancial(x){
 if(!object(x)||x.success===false||!api(x.schemaVersion)||!revision(x.revision)||!timestamp(x.publishedAt)||!container(x.data))throw Error('Invalid financial response');
 return {schemaVersion:x.schemaVersion,revision:x.revision,publishedAt:x.publishedAt,data:x.data};
}
const pair=v=>[v.financialRevision,v.contentRevision];
const samePair=(a,b)=>a.financialRevision===b.financialRevision&&a.contentRevision===b.contentRevision;
// Transport is server-owned and restricted to known actions. The three
// callbacks are required because nested GAS shapes are not yet established.
export function createDocumentedGasReader({getAction,mapFinancial,mapContent,validateBootstrap,now=()=>new Date()}={}){
 if([getAction,mapFinancial,mapContent,validateBootstrap].some(x=>typeof x!=='function'))throw Error('Reviewed GAS transport and nested mappers required');
 return async()=>{
  const before=parseGasVersion(await getAction('version'));
  const [b,c,f]=await Promise.all(['bootstrap','content','financial'].map(a=>getAction(a)));
  const bootstrap=parseGasBootstrap(b),content=parseGasContent(c),financial=parseGasFinancial(f);
  const after=parseGasVersion(await getAction('version'));
  if(!samePair(before,after)||bootstrap.contentRevision!==before.contentRevision||content.revision!==before.contentRevision||financial.revision!==before.financialRevision)throw Error('Inconsistent source revisions');
  if(bootstrap.service!==before.service||content.service!==before.service||after.service!==before.service||bootstrap.apiVersion!==before.apiVersion||content.apiVersion!==before.apiVersion||after.apiVersion!==before.apiVersion)throw Error('Inconsistent service version');
  const mappedFinancial=mapFinancial(financial.data,financial.schemaVersion),officialContent=mapContent(content.data);
  if(!object(mappedFinancial)||mappedFinancial.sourceSpreadsheetId!==sourceId||!Array.isArray(mappedFinancial.plans)||!validContent(officialContent))throw Error('Invalid mapped source data');
  const data={sourceSpreadsheetId:sourceId,plans:mappedFinancial.plans,content:officialContent};
  if(!validDataset(data)||data.plans.reduce((n,p)=>n+p.balances.length,0)!==60)throw Error('Invalid mapped financial data');
  // A reviewed validator must verify bootstrap's nested structures agree with
  // the independent financial and content responses; absence is fail-closed.
  if(validateBootstrap(bootstrap,{financial,content,data})!==true)throw Error('Invalid bootstrap data');
  const combined=createHash('sha256').update(JSON.stringify(pair(before))).digest('hex');
  return {schemaVersion:1,revision:combined,publishedAt:now().toISOString(),data};
 };
}

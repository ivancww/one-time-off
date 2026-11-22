// Maps the Owner-documented nested structures to the existing app model.
// Contract fixtures are not evidence of the deployed GAS response.
import {isDeepStrictEqual} from 'node:util';
import {expected,contentIds,disclosureIds,validContent,validDataset} from '../src/official-data.mjs';
import {parseGasFinancial,parseGasContent} from './gas-actions.mjs';
const source='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const string=x=>typeof x==='string';
function uniqueById(items,ids){
 if(!Array.isArray(items)||items.length!==ids.length)throw Error('Invalid record count');
 const byId=new Map();for(const item of items){if(!record(item)||!string(item.id)||byId.has(item.id)||!ids.includes(item.id))throw Error('Invalid record identity');byId.set(item.id,item)}
 return ids.map(id=>byId.get(id));
}
export function mapFinancial(data){
 if(!record(data)||data.sourceSpreadsheetId!==source)throw Error('Invalid financial source');
 const plans=uniqueById(data.plans,expected.map(x=>x[0])).map(p=>{
  if(!string(p.sheet)||typeof p.rate!=='number'||!Array.isArray(p.balances))throw Error('Invalid plan');
  return {id:p.id,sheet:p.sheet,rate:p.rate,startYear:p.startYear,balances:p.balances.map(row=>{if(!Array.isArray(row)||row.length!==2)return null;return [row[0],row[1]]})};
 });
 const mapped={sourceSpreadsheetId:source,plans};
 if(!validDataset(mapped)||plans.reduce((n,p)=>n+p.balances.length,0)!==172)throw Error('Invalid financial rows');
 return mapped;
}
export function mapContent(data){
 if(!record(data)||!Array.isArray(data.salesFlow)||data.salesFlow.length!==7)throw Error('Invalid sales flow');
 const seen=new Set();const pages=data.salesFlow.map(p=>{
  if(!record(p)||!/^P[1-7]$/.test(p.pageId)||seen.has(p.pageId)||!Number.isSafeInteger(p.order)||!string(p.title)||!string(p.description)||(p.visible!==true&&p.visible!=='是'))throw Error('Invalid page');
  seen.add(p.pageId);return [p.pageId,p.order,p.title,'是',p.description];
 }).sort((a,b)=>a[1]-b[1]);
 const entries=uniqueById(data.content,contentIds).map(r=>{if(!string(r.pageId)||!string(r.type)||!string(r.text)||!string(r.note))throw Error('Invalid content');return [r.id,r.pageId,r.type,r.text,r.note]});
 const disclosures=uniqueById(data.disclosures,disclosureIds).map(r=>{if(!string(r.pageId)||!string(r.type)||!string(r.text)||!string(r.verificationStatus))throw Error('Invalid disclosure');return [r.id,r.pageId,r.type,r.text,r.verificationStatus]});
 const mapped={pages,entries,disclosures};if(!validContent(mapped))throw Error('Invalid official content');return mapped;
}
export function validateBootstrap(bootstrap,{financial,content,data}){
 try{
  // The documented bootstrap fields may hold the action envelope or its data.
  const f=bootstrap.financial, c=bootstrap.officialContent;
  let fd=f,cd=c;
  if(record(f)&&Object.hasOwn(f,'schemaVersion')){const v=parseGasFinancial(f);if(v.revision!==financial.revision)return false;fd=v.data}
  if(record(c)&&Object.hasOwn(c,'success')){const v=parseGasContent(c);if(v.revision!==content.revision||v.service!==content.service||v.apiVersion!==content.apiVersion)return false;cd=v.data}
  return isDeepStrictEqual(mapFinancial(fd),{sourceSpreadsheetId:data.sourceSpreadsheetId,plans:data.plans})&&isDeepStrictEqual(mapContent(cd),data.content);
 }catch(_){return false}
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readOfficialSheets,officialReadHandler} from '../server/sheets-readonly.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/official-snapshot.json',import.meta.url)));
const header=['保單年度','每年提取百分比','結餘倍數'];
const fixture=()=>({valueRanges:[...snapshot.plans.map(p=>({range:`'${p.sheet}'!A1:C1000`,values:[header,...p.balances.map(([y,m])=>[y,p.rate,m])]})),...[["銷售流程",['頁面ID','顯示順序','頁面名稱','預設顯示','頁面用途'],snapshot.content.pages],["官方內容",['內容ID','頁面ID','類型','官方文字','備註'],snapshot.content.entries],["重要提示",['提示ID','適用頁面','類型','內容','核實狀態'],snapshot.content.disclosures]].map(([sheet,head,rows])=>({range:`'${sheet}'!A1:E40`,values:[head,...rows]}))]});
let calls=0;const token=async()=> 'private-token';
const fetcher=async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.hostname,'sheets.googleapis.com');assert.equal(u.searchParams.getAll('ranges').length,7);assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer private-token');return {ok:true,json:async()=>fixture()}};
const options={getAccessToken:token,fetcher,now:()=>new Date('2026-11-10T00:00:00Z')};
const first=await readOfficialSheets(options),again=await readOfficialSheets(options);assert.equal(first.revision,again.revision);assert.equal(first.data.plans.flatMap(p=>p.balances).length,60);assert.equal(first.publishedAt,'2026-11-10T00:00:00.000Z');
for(const mutate of [p=>p.valueRanges[0].values[0][2]='wrong',p=>p.valueRanges[0].values[1][1]=.05,p=>p.valueRanges[0].values[2][0]=5,p=>p.valueRanges[0].values[1][2]=-1,p=>p.valueRanges[0].values[3]=[],p=>p.valueRanges[0].range="'3year 5%'!A1:C1000",p=>p.valueRanges.pop()]){
 const p=structuredClone(fixture());mutate(p);await assert.rejects(()=>readOfficialSheets({...options,fetcher:async()=>({ok:true,json:async()=>p})}));
}
await assert.rejects(()=>readOfficialSheets({...options,fetcher:async()=>({ok:false})}));await assert.rejects(()=>readOfficialSheets({...options,getAccessToken:async()=>''}));
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}});
let res=response();await officialReadHandler({authorize:async()=>false,...options})({method:'GET'},res);assert.equal(res.statusCode,403);assert.equal(calls,2);
res=response();await officialReadHandler({authorize:async()=>true,...options})({method:'POST'},res);assert.equal(res.statusCode,405);assert.equal(calls,2);
res=response();await officialReadHandler({authorize:async()=>true,...options})({method:'GET'},res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).revision,first.revision);assert(!res.body.includes('private-token'));
res=response();await officialReadHandler({authorize:async()=>true,...options,fetcher:async()=>{throw Error('private-token')}})({method:'GET'},res);assert.equal(res.statusCode,503);assert(!res.body.includes('private-token'));
console.log('Read-only Sheets mapping, authorization and failures: PASS');

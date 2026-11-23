// Server-side integration building block. The host must authenticate callers and
// supply a short-lived Sheets read-only OAuth token; never ship it to the client.
import {createHash} from 'node:crypto';
import {validDataset} from '../src/official-data.mjs';

const spreadsheetId='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const plans=[['year5','5year 6%',0.06,5],['year7','7year 6.5%',0.065,7],['year9','9year 7%',0.07,9],['year11','11year 8%',0.08,11],['rollover','自動滾存',0,null]];
const header=['保單年度','每年提取百分比','結餘倍數'];
const contentTabs=[['銷售流程',['頁面ID','顯示順序','頁面名稱','預設顯示','頁面用途']],['官方內容',['內容ID','頁面ID','類型','官方文字','備註']],['重要提示',['提示ID','適用頁面','類型','內容','核實狀態']]];

// Request all tabs in one Sheets API call. Never accept a client-supplied
// spreadsheet ID, range, token, or arbitrary URL.
export async function readOfficialSheets({getAccessToken,fetcher=globalThis.fetch,now=()=>new Date()}={}) {
 if(typeof getAccessToken!=='function')throw Error('Reader credential unavailable');
 const token=await getAccessToken();
 if(typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))throw Error('Reader credential unavailable');
 const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet`);
 for(const [,sheet] of plans)url.searchParams.append('ranges',`'${sheet}'!A1:C`);
 for(const [sheet] of contentTabs)url.searchParams.append('ranges',`'${sheet}'!A1:E`);
 url.searchParams.set('valueRenderOption','UNFORMATTED_VALUE');
 const response=await fetcher(url.href,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('Sheets read failed');
 const payload=await response.json();
 if(!Array.isArray(payload.valueRanges)||payload.valueRanges.length!==plans.length+contentTabs.length)throw Error('Invalid Sheets response');
 const result=plans.map(([id,sheet,rate,startYear],i)=>{
  const range=payload.valueRanges[i], rows=range?.values;
  // A1 range must name the expected tab, not merely occupy its index.
  const tab=range?.range?.match(/^'((?:[^']|'')+)'!|^([^!]+)!/);
  if(!tab || (tab[1]?.replace(/''/g,"'")||tab[2])!==sheet || !Array.isArray(rows) || rows.length<2 || rows.length>5000 || rows[0].length!==3 || !header.every((h,j)=>rows[0][j]===h))throw Error('Invalid Sheet schema');
  const balances=rows.slice(1).map(row=>{
   if(!Array.isArray(row)||row.length!==3||row[1]!==((startYear!==null&&row[0]<startYear)?0:rate))throw Error('Invalid Sheet row');
   return [row[0],row[2]];
  });
  return {id,sheet,rate,startYear,balances};
 });
 const contentRows=contentTabs.map(([sheet,headers],i)=>{
  const range=payload.valueRanges[plans.length+i],rows=range?.values;
  const tab=range?.range?.match(/^'((?:[^']|'')+)'!|^([^!]+)!/);
  if(!tab || (tab[1]?.replace(/''/g,"'")||tab[2])!==sheet || !Array.isArray(rows) || rows.length<2 || rows.length>5000 || rows[0].length!==headers.length || !headers.every((v,j)=>rows[0][j]===v))throw Error('Invalid content schema');
  return rows.slice(1);
 });
 const data={sourceSpreadsheetId:spreadsheetId,plans:result,content:{pages:contentRows[0],entries:contentRows[1],disclosures:contentRows[2]}};
 if(!validDataset(data))throw Error('Invalid Sheet values');
 const publishedAt=now().toISOString(); // time of this source read, not product publication
 const revision=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 return {schemaVersion:1,revision,publishedAt,data};
}

// Mount behind an authorized same-origin HTTPS gateway. The host controls
// session/reader authorization; an unauthorized caller never triggers a read.
export function officialReadHandler({authorize,getAccessToken,fetcher,now}={}) {
 if(typeof authorize!=='function')throw Error('Caller authorization required');
 return async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end()}
  try{
   if(!await authorize(req)){res.statusCode=403;return res.end()}
   const envelope=await readOfficialSheets({getAccessToken,fetcher,now});
   res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(envelope));
  }catch(_){res.statusCode=503;return res.end('Official data unavailable')}
 };
}

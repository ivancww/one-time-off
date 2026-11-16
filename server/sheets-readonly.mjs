// Server-side integration building block. The host must authenticate callers and
// supply a short-lived Sheets read-only OAuth token; never ship it to the client.
import {createHash} from 'node:crypto';
import {validDataset} from '../src/official-data.mjs';

const spreadsheetId='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const plans=[['year1','1year 4%',0.04],['year3','3year 5%',0.05],['year5','5year 6%',0.06],['rollover','自動滾存',0]];
const header=['保單年度','每年提取百分比','結餘倍數'];

// Request all tabs in one Sheets API call. Never accept a client-supplied
// spreadsheet ID, range, token, or arbitrary URL.
export async function readOfficialSheets({getAccessToken,fetcher=globalThis.fetch,now=()=>new Date()}={}) {
 if(typeof getAccessToken!=='function')throw Error('Reader credential unavailable');
 const token=await getAccessToken();
 if(typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))throw Error('Reader credential unavailable');
 const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet`);
 for(const [,sheet] of plans)url.searchParams.append('ranges',`'${sheet}'!A1:C`);
 url.searchParams.set('valueRenderOption','UNFORMATTED_VALUE');
 const response=await fetcher(url.href,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('Sheets read failed');
 const payload=await response.json();
 if(!Array.isArray(payload.valueRanges)||payload.valueRanges.length!==plans.length)throw Error('Invalid Sheets response');
 const result=plans.map(([id,sheet,rate],i)=>{
  const range=payload.valueRanges[i], rows=range?.values;
  // A1 range must name the expected tab, not merely occupy its index.
  const tab=range?.range?.match(/^'((?:[^']|'')+)'!|^([^!]+)!/);
  if(!tab || (tab[1]?.replace(/''/g,"'")||tab[2])!==sheet || !Array.isArray(rows) || rows.length<2 || rows.length>5000 || rows[0].length!==3 || !header.every((h,j)=>rows[0][j]===h))throw Error('Invalid Sheet schema');
  const balances=rows.slice(1).map(row=>{
   if(!Array.isArray(row)||row.length!==3||row[1]!==rate)throw Error('Invalid Sheet row');
   return [row[0],row[2]];
  });
  return {id,sheet,rate,balances};
 });
 const data={sourceSpreadsheetId:spreadsheetId,plans:result};
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

// GAS contract boundary. The caller must supply parsers grounded in reviewed
// action responses; there is deliberately no guessed production GAS schema.
import {validContent,validDataset} from '../src/official-data.mjs';
const sourceId='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const actions=['bootstrap','version','content','financial'];
const revisionOk=r=>typeof r==='string'&&/^[a-zA-Z0-9._-]{1,128}$/.test(r);

// Every parse function translates one action to the documented internal model.
// getAction is a server-owned transport; never take an endpoint or action from
// a client request. Each parser must throw for an unrecognized response.
export function createGasContractReader({getAction,parsers,now=()=>new Date()}={}){
 if(typeof getAction!=='function'||!parsers||actions.some(name=>typeof parsers[name]!=='function'))throw Error('Reviewed GAS parsers and transport required');
 return async()=>{
  const read=async name=>parsers[name](await getAction(name));
  const before=await read('version');if(!revisionOk(before?.revision))throw Error('Invalid source revision');
  const [bootstrap,content,financial]=await Promise.all(['bootstrap','content','financial'].map(read));
  const after=await read('version');if(!revisionOk(after?.revision)||before.revision!==after.revision)throw Error('Source changed during read');
  if(bootstrap?.sourceSpreadsheetId!==sourceId || !Array.isArray(bootstrap.pageIds) || bootstrap.pageIds.join(',')!=='P1,P2,P3,P4,P5,P6,P7')throw Error('Invalid bootstrap');
  if(!validContent(content)||!financial || financial.sourceSpreadsheetId!==sourceId || !Array.isArray(financial.plans))throw Error('Invalid source data');
  const data={sourceSpreadsheetId:sourceId,plans:financial.plans,content};
  if(!validDataset(data)||data.plans.reduce((n,p)=>n+p.balances.length,0)!==60)throw Error('Invalid financial data');
  return {schemaVersion:1,revision:before.revision,publishedAt:now().toISOString(),data};
 };
}

// Host must supply its own authentication/authorization. This handler exposes
// neither arbitrary URLs nor action forwarding and fails closed by default.
export function gasOfficialReadHandler({authorize,read}={}){
 if(typeof authorize!=='function'||typeof read!=='function')throw Error('Authorization and reviewed reader required');
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end()}
  try{if(!await authorize(req)){res.statusCode=403;return res.end()}const result=await read();res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(result))}catch(_){res.statusCode=503;return res.end('Official data unavailable')}
 };
}

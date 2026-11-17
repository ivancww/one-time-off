async function goTo(page,target){
 target=String(target);
 const node=page.locator('#flow-progress');
 let current=await node.getAttribute('data-page-key');
 if(current===target)return;
 if(/^\d+$/.test(current)&&/^\d+$/.test(target)){
   const direction=Number(current)<Number(target)?'#next':'#back';
   for(let tries=0;tries<32&&current!==target;tries++){
     await page.locator(direction).click();
     current=await node.getAttribute('data-page-key');
   }
 }else{
   for(let tries=0;tries<32&&await page.locator('#back').isEnabled();tries++)await page.locator('#back').click();
   for(let tries=0;tries<32;tries++){
     current=await node.getAttribute('data-page-key');
     if(current===target)break;
     if(!await page.locator('#next').isEnabled())break;
     await page.locator('#next').click();
   }
 }
 if((await node.getAttribute('data-page-key'))!==target)throw Error('guided flow could not reach '+target);
}
// Simulated upstream action responses; not a real GAS integration test.
const {chromium}=require('playwright'),https=require('node:https'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=process.cwd(),snapshot=require('../data/official-snapshot.json'),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
(async()=>{const temp=await fsp.mkdtemp(path.join(os.tmpdir(),'ava-gas-cert-'));let server,browser;try{
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(temp,'key.pem'),'-out',path.join(temp,'cert.pem'),'-subj','/CN=127.0.0.1','-days','1'],{stdio:'ignore'});
const {createOfficialGasHandler}=await import('../server/gas-gateway.mjs');let changed=false,outage=false;
const payload=()=>{const p=structuredClone(snapshot.plans);if(changed)p[0].balances.find(r=>r[0]===20)[1]=1.35;const c={salesFlow:snapshot.content.pages.map(([pageId,order,title,visible,description])=>({pageId,order,title,visible:visible==='是',description})),content:snapshot.content.entries.map(([id,pageId,type,text,note=''])=>({id,pageId,type,text:changed&&id==='P2_TITLE'?'更新的官方標題':text,note})),disclosures:snapshot.content.disclosures.map(([id,pageId,type,text,verificationStatus])=>({id,pageId,type,text,verificationStatus}))};const f={schemaVersion:1,revision:changed?'f2':'f1',publishedAt:new Date().toISOString(),data:{sourceSpreadsheetId:snapshot.sourceSpreadsheetId,plans:p}};return {version:{success:true,service:'AVA_ONE_TIME_OFF',apiVersion:1,financialRevision:f.revision,contentRevision:changed?'c2':'c1',checkedAt:new Date().toISOString()},content:{success:true,service:'AVA_ONE_TIME_OFF',apiVersion:1,revision:changed?'c2':'c1',readAt:new Date().toISOString(),data:c},financial:f,bootstrap:{success:true,service:'AVA_ONE_TIME_OFF',apiVersion:1,financial:f,officialContent:c,contentRevision:changed?'c2':'c1'}}};
const fetcher=async url=>{if(outage)throw Error('simulated');return new Response(JSON.stringify(payload()[new URL(url).searchParams.get('action')]),{headers:{'content-type':'application/json'}})};
const handler=createOfficialGasHandler({authorize:async req=>req.headers.cookie==='test-auth=ok',fetcher});
server=https.createServer({key:await fsp.readFile(path.join(temp,'key.pem')),cert:await fsp.readFile(path.join(temp,'cert.pem'))},(req,res)=>{const u=new URL(req.url,'https://127.0.0.1');if(u.pathname==='/official')return handler(req,res);const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();if(u.pathname==='/')b=Buffer.from(b.toString().replace('name="official-data-endpoint" content=""','name="official-data-endpoint" content="/official"'));res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`https://127.0.0.1:${server.address().port}`;browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const ctx=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});await ctx.addCookies([{name:'test-auth',value:'ok',url:base,secure:true,httpOnly:true}]);const page=await ctx.newPage();await page.goto(base+'/?avaEntry=user');await page.locator('#diag-mode').getByText('LIVE',{exact:false}).waitFor({state:'attached'});const rev=await page.locator('#diag-revision').textContent();await page.locator('#page-title').fill('保留用戶標題');await page.locator('#save-user').click();await page.getByText('已儲存並核對本機資料。').waitFor();changed=true;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(old=>document.querySelector('#diag-revision').textContent!==old,rev);assert.equal(await page.locator('#page-title').innerText(),'保留用戶標題');await goTo(page,'1');assert.equal(await page.locator('#page-title').innerText(),'更新的官方標題');await goTo(page,'4');await page.locator('#arrangement').selectOption('year1');await goTo(page,'5');await page.locator('[data-year="20"]').click();assert.equal(await page.locator('.result-card strong').innerText(),'HK$ 675,000');outage=true;await page.reload();await page.locator('#diag-mode').getByText('CACHED',{exact:false}).waitFor({state:'attached'});await goTo(page,'0');assert.equal(await page.locator('#page-title').innerText(),'保留用戶標題');await ctx.close();console.log('Documented GAS gateway to app, content/financial update and offline: PASS (contract fixtures)');
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await fsp.rm(temp,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});

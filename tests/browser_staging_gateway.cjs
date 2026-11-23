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
const {chromium}=require('playwright'),{execFileSync}=require('node:child_process'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const stage=execFileSync(process.execPath,['tools/create-staging.mjs','STAGING_TEST_ID_123456789012345'],{encoding:'utf8'}).trim(),certdir=await fs.mkdtemp(path.join(os.tmpdir(),'ava-cert-'));let server,browser;try{
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(certdir,'key.pem'),'-out',path.join(certdir,'cert.pem'),'-subj','/CN=127.0.0.1','-days','1'],{stdio:'ignore'});
const {startStagingGateway}=await import('../tools/staging-gateway.mjs'),snapshot=require('../data/official-snapshot.json');let multiplier=1.301945,unavailable=false;
const fetcher=async()=>{if(unavailable)throw Error('simulated outage');return {ok:true,json:async()=>({valueRanges:[...snapshot.plans.map(p=>({range:`'${p.sheet}'!A1:C100`,values:[['保單年度','每年提取百分比','結餘倍數'],...p.balances.map(([year,value])=>[year,(p.startYear!==null&&year<p.startYear)?0:p.rate,p.id==='year5'&&year===20?multiplier:value])]})),...[["銷售流程",['頁面ID','顯示順序','頁面名稱','預設顯示','頁面用途'],snapshot.content.pages],["官方內容",['內容ID','頁面ID','類型','官方文字','備註'],snapshot.content.entries],["重要提示",['提示ID','適用頁面','類型','內容','核實狀態'],snapshot.content.disclosures]].map(([sheet,head,rows])=>({range:`'${sheet}'!A1:E40`,values:[head,...rows]}))]})}};
server=await startStagingGateway({directory:stage,key:await fs.readFile(path.join(certdir,'key.pem')),cert:await fs.readFile(path.join(certdir,'cert.pem')),getAccessToken:async()=> 'mock-token',fetcher});browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});const context=await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});await context.addCookies([{name:'staging_session',value:server.cookie.split('=')[1],url:server.origin,httpOnly:true,secure:true,sameSite:'Strict'}]);const page=await context.newPage();
await page.goto(server.origin+'/?avaEntry=user');await page.locator('#diag-mode').getByText('LIVE',{exact:false}).waitFor({state:'attached'});let before=await page.locator('#diag-revision').textContent();await goTo(page,'6');await page.locator('[data-withdraw-start=year5]').click();await goTo(page,'5');await page.locator('[data-year="20"]').click();assert.equal(await page.locator('.result-card strong').textContent(),'HK$ 650,972.5');
multiplier=1.35;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(old=>document.querySelector('#diag-revision').textContent!==old,before);assert.equal(await page.locator('.result-card strong').textContent(),'HK$ 675,000');
unavailable=true;await page.reload();await page.locator('#diag-mode').getByText('CACHED',{exact:false}).waitFor({state:'attached'});await context.close();console.log('Local HTTPS staging app and gateway with simulated Sheets: PASS');
}finally{if(browser)await browser.close();if(server)await server.close();await fs.rm(stage,{recursive:true,force:true});await fs.rm(certdir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});

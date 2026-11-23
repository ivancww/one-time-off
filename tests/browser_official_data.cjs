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
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.cwd(),snapshot=require('../data/official-snapshot.json');
const base='https://app.example.test',mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
let state='live', revision='test-r1', amount=1.301945;
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{
async function context(){const ctx=await browser.newContext({serviceWorkers:'block'});await ctx.route('https://app.example.test/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/official'){
 if(state==='offline')return route.abort('failed');if(state==='denied')return route.fulfill({status:403,body:'denied'});
 const data=structuredClone(snapshot);data.plans[0].balances.find(row=>row[0]===20)[1]=amount;if(revision==='test-r2')data.content.entries.find(row=>row[0]==='P2_AMOUNT')[3]='官方更新 <img src=x>';if(state==='bad')data.plans[0].balances[0]=[5];
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,revision,publishedAt:state==='stale'?new Date(Date.now()-8*86400000).toISOString():new Date().toISOString(),data})});
 }const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return route.fulfill({status:404});let body=fs.readFileSync(f);if(u.pathname==='/')body=Buffer.from(body.toString().replace('name="official-data-endpoint" content=""','name="official-data-endpoint" content="/official"'));return route.fulfill({status:200,contentType:mime[path.extname(f)]||'text/plain',body})});return ctx}
let ctx=await context(),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/?avaEntry=user');await page.locator('#diag-mode').getByText('LIVE',{exact:false}).waitFor({state:'attached'});assert.equal(await page.locator('#diag-result').textContent(),'成功');assert.equal(await page.locator('#diag-revision').textContent(),'test-r1');const initial=await page.locator('#diag-time').textContent();assert(!initial.includes('未有'));
await page.locator('#page-title').fill('保存的內容');await page.locator('#save-user').click();await page.getByText('已儲存並核對本機資料。').waitFor();
await goTo(page,'6');await page.locator('[data-withdraw-start=year5]').click();await goTo(page,'5');await page.locator('[data-year="20"]').click();assert.equal(await page.locator('.result-card strong').innerText(),'HK$ 650,972.5');
state='offline';await page.reload();await page.locator('#diag-mode').getByText('CACHED',{exact:false}).waitFor({state:'attached'});assert((await page.locator('#diag-result').textContent()).includes('失敗'));fs.mkdirSync('screenshots',{recursive:true});await page.locator('#source-diagnostics summary').click();await page.screenshot({path:'screenshots/diagnostics-cached.png',fullPage:true});await page.locator('#source-diagnostics summary').click();await goTo(page,'0');assert.equal(await page.locator('#page-title').innerText(),'保存的內容');
state='bad';await page.reload();await page.locator('#diag-mode').getByText('CACHED',{exact:false}).waitFor({state:'attached'});assert((await page.locator('#diag-result').textContent()).includes('失敗'));
state='denied';await page.reload();await page.locator('#diag-mode').getByText('CACHED',{exact:false}).waitFor({state:'attached'});assert((await page.locator('#diag-result').textContent()).includes('失敗'));
state='live';revision='test-r2';amount=1.35;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.locator('#diag-revision').getByText('test-r2').waitFor({state:'attached'});assert.equal(await page.locator('#diag-result').textContent(),'成功');assert(Date.parse(await page.locator('#diag-time').textContent())>=Date.parse(initial));await goTo(page,'2');assert.equal(await page.locator('label[for=capital]').innerText(),'官方更新 <img src=x>');assert.equal(await page.locator('#app img').count(),0);await goTo(page,'6');await page.locator('[data-withdraw-start=year5]').click();await goTo(page,'5');await page.locator('[data-year="20"]').click();assert.equal(await page.locator('.result-card strong').innerText(),'HK$ 675,000');
fs.mkdirSync('screenshots',{recursive:true});for(const [name,width,height] of [['ipad',768,1024],['honor-unfolded',800,1024]]){await page.setViewportSize({width,height});await page.locator('#source-diagnostics summary').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`screenshots/diagnostics-${name}.png`,fullPage:true});await page.locator('#source-diagnostics summary').click()}
await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ava-one-time-off-official',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const tx=db.transaction('cache','readwrite');tx.objectStore('cache').put({broken:true},'official-v1:https://app.example.test/official');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()});state='denied';await page.reload();await page.locator('#diag-mode').getByText('SNAPSHOT',{exact:false}).waitFor({state:'attached'});assert.equal(await page.locator('#page-title').count(),1);assert.equal(await page.locator('#page-title').innerText(),'保存的內容');state='live';await page.goto(base+'/?avaEntry=frontend');assert.equal(await page.locator('#source-diagnostics').isVisible(),false);assert.deepEqual(errors,[]);await ctx.close();
state='denied';ctx=await context();page=await ctx.newPage();await page.goto(base+'/?avaEntry=user');await page.locator('#diag-mode').getByText('SNAPSHOT',{exact:false}).waitFor({state:'attached'});assert((await page.locator('#diag-result').textContent()).includes('失敗'));await page.locator('#source-diagnostics summary').click();await page.screenshot({path:'screenshots/diagnostics-snapshot.png',fullPage:true});await ctx.close();
state='stale';revision='test-old';amount=1.301945;ctx=await context();page=await ctx.newPage();await page.goto(base+'/?avaEntry=user');await page.locator('#diag-mode').getByText('LIVE',{exact:false}).waitFor({state:'attached'});assert((await page.locator('#diag-freshness').textContent()).includes('過期'));await ctx.close();
console.log('MOCK source changes, diagnostics, cache, fallback, recovery and user data: PASS');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

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
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=process.cwd(), data=require('../data/official-snapshot.json');
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':decodeURIComponent(new URL(req.url,'http://localhost').pathname)));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'})[path.extname(f)]||'text/plain');res.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port+'/';await page.goto(url);
await goTo(page,'2');await page.locator('#currentAge').fill('40');await page.locator('#capital').fill('500000');await page.locator('#bankRate').fill('1.5');
await goTo(page,'0');assert.equal(await page.locator('[data-method]').count(),4);assert((await page.locator('[data-method="other"]').innerText()).includes('儲蓄計劃'));
await goTo(page,'1');assert.equal(await page.locator('[data-purpose]').count(),4);
await goTo(page,'3');await page.locator('[data-year="5"]').click();assert.equal(await page.locator('.p4-total-difference span').innerText(),'預期未來可能的差額');assert((await page.locator('.p4-total-difference strong').innerText()).startsWith('+HK$'));assert.equal(await page.locator('.p4-total-difference strong').evaluate(e=>getComputedStyle(e).color),'rgb(220, 38, 38)');assert(await page.locator('.p4-total-difference').evaluate(e=>e.previousElementSibling.classList.contains('p4-visual-story')));
await goTo(page,'4');assert.equal(await page.locator('#arrangement, .calculation-note').count(),0);
await goTo(page,'5');assert.equal(await page.locator('.annual-details, .calculation-note').count(),0);
await goTo(page,'6');assert.deepEqual(await page.locator('[data-withdraw-start]').allTextContents(),['自動滾存（不提取）','第1年領取','第3年領取','第5年領取']);await page.locator('[data-withdraw-start="rollover"]').click();await page.locator('[data-withdraw-year="20"]').click();assert.equal(await page.locator('.withdrawal-result strong').nth(2).innerText(),'HK$ 1,625,000');
for(const id of ['year1','year3','year5']){const p=data.plans.find(x=>x.id===id);await page.locator('[data-withdraw-start="'+id+'"]').click();assert.deepEqual(await page.locator('.withdrawal-result strong').allTextContents(),['待核實','待核實','HK$ '+(500000*Object.fromEntries(p.balances)[20]).toLocaleString('en-HK',{maximumFractionDigits:2})])}
await goTo(page,'3');await page.locator('[data-year="5"]').click();await goTo(page,'6');await page.locator('[data-withdraw-start="year1"]').click();await goTo(page,'3');assert((await page.locator('.p4-total-difference strong').innerText()).startsWith('-HK$'));
for(const p of data.plans){
 await goTo(page,'6');await page.locator('[data-withdraw-start="'+p.id+'"]').click();await goTo(page,'5');
 assert.equal(await page.locator('[data-year]').count(),p.balances.length);
 for(const [year,m] of p.balances){await page.locator('[data-year="'+year+'"]').click();assert.equal(await page.locator('.result-card strong').innerText(),'HK$ '+(500000*m).toLocaleString('en-HK',{maximumFractionDigits:2}));assert.equal(await page.locator('.timeline-rail__item[aria-selected=true]').count(),1)}
}
await page.locator('[data-year="5"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-year="5"]').getAttribute('aria-selected'),'true');
fs.mkdirSync('screenshots',{recursive:true});for(const [name,width,height] of [['ipad',768,1024],['honor-unfolded',800,1024],['mobile',375,812],['landscape',1024,768]]){
 await page.setViewportSize({width,height});await goTo(page,'6');await page.locator('[data-withdraw-start="year1"]').click();await goTo(page,'5');await page.locator('[data-year="20"]').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name);await page.screenshot({path:'screenshots/projection-'+name+'.png',fullPage:true});assert.equal(await page.locator('.annual-details').count(),0);
}
assert.deepEqual(errors,[]);console.log('All source-supported annual balances, age rails and device viewport simulation: PASS')}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});

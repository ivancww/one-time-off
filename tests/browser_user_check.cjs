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
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd();
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'})[path.extname(f)]||'text/plain');res.end(b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}/`;await page.goto(url+'?avaEntry=user');await page.locator('#user-note').fill('<img src=x onerror=alert(1)>');await goTo(page,'6');await page.locator('#user-note').fill('第二頁個人說明');await page.locator('#save-user').click();await page.getByRole('status').getByText('已儲存並核對本機資料。').waitFor();await page.reload();await page.locator('#user-note').waitFor();assert.equal(await page.locator('#user-note').inputValue(),'<img src=x onerror=alert(1)>');await goTo(page,'6');assert.equal(await page.locator('#user-note').inputValue(),'第二頁個人說明');const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-user').click()]);const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.content.summaryNote,'第二頁個人說明');await page.locator('#import-user').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'ava-one-time-off-user',version:1,content:{introNote:'x',summaryNote:'x',official:3}}))});await page.locator('#user-status').getByText('匯入失敗',{exact:false}).waitFor();assert.equal(await page.locator('#user-note').inputValue(),'第二頁個人說明');await page.locator('#import-user').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'ava-one-time-off-user',version:1,content:{introNote:'還原內容',summaryNote:'新說明'}}))});await page.waitForFunction(()=>document.querySelector('#user-note')?.value==='新說明');await page.locator('#save-user').click();await page.getByRole('status').getByText('已儲存並核對本機資料。').waitFor();await page.reload();await goTo(page,'6');assert.equal(await page.locator('#user-note').inputValue(),'新說明');await page.goto(url);assert((await page.locator('#app').innerText()).includes('還原內容'));assert.equal(await page.locator('#app img').count(),0);await page.goto(url+'?avaEntry=admin');assert((await page.locator('#app').innerText()).includes('管理尚未啟用'));assert.deepEqual(errors,[]);console.log('User draft across two pages, save/readback/reload, safe text rendering and Admin denial: PASS');}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});

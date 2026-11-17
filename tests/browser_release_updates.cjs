const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
let newest="0.3.2";const root=process.cwd();
const source=JSON.parse(fs.readFileSync(path.join(root,"app-release.json"),"utf8"));
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,"http://localhost"),p=u.pathname;
 if(p==="/app-release.json"){
  const m={...source,version:newest,releaseId:"one-time-off@"+newest,changes:["測試更新版本："+newest],history:[{version:newest,title:"測試更新",changes:["測試更新版本："+newest]},...source.history]};
  res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");return res.end(JSON.stringify(m));
 }
 const file=path.resolve(root,"."+(p==="/"?"/index.html":decodeURIComponent(p)));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,b)=>{if(err)return res.writeHead(404).end();res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".webmanifest":"application/manifest+json",".svg":"image/svg+xml"})[path.extname(file)]||"text/plain");res.end(b)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 try{
  const base="http://127.0.0.1:"+server.address().port+"/";
  const ctx=await browser.newContext({serviceWorkers:"block"});const page=await ctx.newPage();
  await page.goto(base+"?avaEntry=frontend");
  await page.waitForFunction(()=>localStorage.getItem("ava:one-time-off:observed-release")==="0.3.2");
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0,"first-time visitor must not see fictitious update");
  await page.locator("#release-history").click();assert.equal(await page.locator("#ava-release-dialog[open]").count(),1);
  assert((await page.locator("#ava-release-dialog").innerText()).includes("0.3.2"));
  await page.getByRole("button",{name:"返回",exact:true}).click();assert.equal(await page.locator("#ava-release-dialog[open]").count(),0);
  await page.evaluate(()=>localStorage.setItem("ava:one-time-off:observed-release","0.3.1"));await page.reload();
  await page.getByRole("heading",{name:"更新通知"}).waitFor();assert((await page.locator("#ava-release-dialog").innerText()).includes("v0.3.2"));
  await page.getByRole("button",{name:"了解，開始使用"}).click();await page.reload();
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0,"acknowledged version must not repeat");
  await page.goto(base+"?avaEntry=user");await page.locator("#page-title").waitFor();await page.locator("#page-title").fill("更新前儲存的草稿");
  newest="0.3.3";await page.evaluate(()=>window.dispatchEvent(new Event("online")));
  await page.getByRole("heading",{name:"必須更新"}).waitFor();assert.equal(await page.locator("#ava-release-dialog[open]").count(),1);
  assert((await page.locator("#ava-release-dialog").innerText()).includes("v0.3.3"));
  assert.equal(await page.locator("#ava-release-dialog .release-primary").innerText(),"儲存草稿並更新");
  newest="0.3.2";await page.locator("#ava-release-dialog .release-primary").click();
  await page.waitForLoadState("load");await page.locator("#page-title").waitFor();
  assert.equal(await page.locator("#page-title").innerText(),"更新前儲存的草稿","forced update must preserve user edits");
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0);
  console.log("Release updates: first visit baseline, one-time notice, history, mandatory refresh, saved User Edit: PASS");
  await ctx.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

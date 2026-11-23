const {chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=process.cwd();
const source=JSON.parse(fs.readFileSync(path.join(root,"app-release.json"),"utf8"));
const baseline=source.version, prior=source.history[1]?.version||baseline;
const nextVersion=baseline.split(".").map((x,i)=>i===2?Number(x)+1:Number(x)).join(".");
let newest=baseline;
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
  await page.waitForFunction(v=>localStorage.getItem("ava:one-time-off:observed-release")===v,baseline);
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0,"first-time visitor must not see fictitious update");
  assert.equal(await page.locator("#release-history").count(),0,"header Update History button must remain absent");
  await page.evaluate(v=>localStorage.setItem("ava:one-time-off:observed-release",v),prior);await page.reload();
  await page.getByRole("heading",{name:"更新通知"}).waitFor();assert((await page.locator("#ava-release-dialog").innerText()).includes("v"+baseline));
  await page.getByRole("button",{name:"了解，開始使用"}).click();await page.reload();
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0,"acknowledged version must not repeat");
  await page.goto(base+"?avaEntry=user");await page.locator("#page-title").waitFor();await page.locator("#page-title").fill("更新前儲存的草稿");
  newest=nextVersion;await page.evaluate(()=>window.dispatchEvent(new Event("online")));
  await page.getByRole("heading",{name:"必須更新"}).waitFor();assert.equal(await page.locator("#ava-release-dialog[open]").count(),1);
  assert((await page.locator("#ava-release-dialog").innerText()).includes("v"+nextVersion));
  assert.equal(await page.locator("#ava-release-dialog .release-primary").innerText(),"儲存草稿並更新");
  newest=baseline;await page.locator("#ava-release-dialog .release-primary").click();
  await page.waitForLoadState("load");await page.locator("#page-title").waitFor();
  assert.equal(await page.locator("#page-title").innerText(),"更新前儲存的草稿","forced update must preserve user edits");
  assert.equal(await page.locator("#ava-release-dialog[open]").count(),0);
  console.log("Release updates: first visit baseline, one-time notice, removed history entry, mandatory refresh, saved User Edit: PASS");
  await ctx.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

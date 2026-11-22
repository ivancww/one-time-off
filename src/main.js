import bundledData from "../data/official-snapshot.json" with {type:"json"};
import {loadOfficialData,validDataset} from "./official-data.mjs";
let data=bundledData;
let officialContent=bundledData.content;
// Deployments may configure an authorized same-origin endpoint; never put credentials in this client.
const OFFICIAL_ENDPOINT=document.querySelector?.('meta[name="official-data-endpoint"]')?.content.trim() || null;
let officialStatus={mode:"snapshot",publishedAt:null};
let lastSuccessfulRead=null;
function openOfficialCache(){return new Promise((resolve,reject)=>{const r=indexedDB.open("ava-one-time-off-official",1);r.onupgradeneeded=()=>r.result.createObjectStore("cache");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error("cache blocked"))})}
const officialCache={async read(endpoint){const db=await openOfficialCache();try{return await new Promise((resolve,reject)=>{const tx=db.transaction("cache","readonly"),r=tx.objectStore("cache").get("official-v1:"+endpoint);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}},async write(value,endpoint){const db=await openOfficialCache();try{await new Promise((resolve,reject)=>{const tx=db.transaction("cache","readwrite");tx.objectStore("cache").put(value,"official-v1:"+endpoint);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}};
const names=officialContent.pages.map(p=>p[2]);
const goalLabels=officialContent.entries.filter(r=>/^P1_GOAL[1-4]$/.test(r[0])).map(r=>r[3]);
const state={step:0,capital:500000,term:15,plan:"rollover",bankRate:1.5,bankYears:15,goals:[],method:"bank",purpose:"flex",currentAge:null,withdrawalStart:"none",withdrawalYear:15};
const $=s=>document.querySelector(s);
// Only these user-owned notes are editable. Financial facts and disclosures are not.
const userPages=[0,1,2,3,4,5,6], userKeys=["introNote","summaryNote"];
const blankUser=()=>({introNote:"",summaryNote:"",titles:Array(7).fill(""),paragraphs:Array(3).fill(""),customPages:[],deletedPages:[]});
const cloneUser=value=>JSON.parse(JSON.stringify(value));
let customPageId=null, previewUser=false, showSummary=false;
let userSaved=blankUser(), userDraft=cloneUser(userSaved), userReady=false, userError="", userDirty=false, userSaving=false;
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function validLegacyUserData(value){return !!value && typeof value==="object" && !Array.isArray(value) && Object.keys(value).sort().join(",")==="introNote,summaryNote" && userKeys.every(k=>typeof value[k]==="string" && value[k].length<=2000)}
function validV2(value){return !!value && typeof value==="object" && !Array.isArray(value) && Object.keys(value).sort().join(",")==="introNote,summaryNote,titles" && userKeys.every(k=>typeof value[k]==="string" && value[k].length<=2000) && Array.isArray(value.titles) && value.titles.length===7 && value.titles.every(x=>typeof x==="string" && x.length<=120)}
function validV3(value){if(!value || typeof value!=="object" || Array.isArray(value) || Object.keys(value).sort().join(",")!=="customPages,introNote,paragraphs,summaryNote,titles")return false;const old={introNote:value.introNote,summaryNote:value.summaryNote,titles:value.titles};if(!validV2(old)||!Array.isArray(value.paragraphs)||value.paragraphs.length!==3||!value.paragraphs.every(x=>typeof x==="string"&&x.length<=2000)||!Array.isArray(value.customPages)||value.customPages.length>20)return false;const ids=new Set();return value.customPages.every(p=>{if(!p || typeof p!=="object" || Object.keys(p).sort().join(",")!=="after,id,text,title,visible" || typeof p.id!=="string" || !/^u-[a-z0-9-]{1,80}$/.test(p.id) || ids.has(p.id) || typeof p.title!=="string" || p.title.length>120 || typeof p.text!=="string" || p.text.length>2000 || !Number.isInteger(p.after) || p.after<0 || p.after>6 || typeof p.visible!=="boolean")return false;ids.add(p.id);return true})}
function validMedia(media){return media==="" || (typeof media==="string" && media.length<=1400000 && /^data:(image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+={0,2}$/.test(media))}
function validV4(value){if(!value || !Array.isArray(value.customPages))return false;let total=0;for(const p of value.customPages){if(!p || !validMedia(p.media))return false;total+=p.media.length}if(total>5500000)return false;const old={...value,customPages:value.customPages.map(({media,...rest})=>rest)};return validV3(old)}
function validUserData(value){if(!value || !Array.isArray(value.deletedPages) || Object.keys(value).sort().join(",")!=="customPages,deletedPages,introNote,paragraphs,summaryNote,titles")return false;const {deletedPages,...old}=value;return validV4({...old,customPages:[...old.customPages,...deletedPages]})}
function migrateUserData(value){if(validUserData(value))return cloneUser(value);if(validV4(value))return {...cloneUser(value),deletedPages:[]};if(validV3(value)){const v=cloneUser(value);v.customPages=v.customPages.map(p=>({...p,media:""}));return {...v,deletedPages:[]}}if(validV2(value))return {...blankUser(),...cloneUser(value),deletedPages:[]};if(validLegacyUserData(value))return {...blankUser(),introNote:value.introNote,summaryNote:value.summaryNote,deletedPages:[]};throw Error("invalid user data")}
const userChanged=()=>JSON.stringify(userDraft)!==JSON.stringify(userSaved);
function openUserDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open("ava-one-time-off-user",1);request.onupgradeneeded=()=>{request.result.createObjectStore("content")};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error("storage blocked"))})}
async function readUserData(){const db=await openUserDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction("content","readonly"),request=tx.objectStore("content").get("saved");request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
async function writeUserData(value){if(!validUserData(value))throw Error("invalid user data");const db=await openUserDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction("content","readwrite");tx.objectStore("content").put(value,"saved");tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}const result=await readUserData();if(!validUserData(result)||JSON.stringify(result)!==JSON.stringify(value))throw Error("readback failed")}
function userNote(){if(customPageId)return "";const key=state.step===0?"introNote":state.step===6?"summaryNote":null;if(!key)return "";const value=(entryMode(window.location.search)==="user"?userDraft:userSaved)[key];if(entryMode(window.location.search)==="user" && !previewUser)return '<label for="user-note">個人補充說明（不屬於官方產品資料）</label><textarea id="user-note" maxlength="2000" rows="3">'+escapeText(value)+'</textarea>';return value?'<div class="note"><strong>個人補充說明（不屬於官方產品資料）</strong><p>'+escapeText(value)+'</p></div>':""}

const money=n=>Number(n).toLocaleString("en-HK",{maximumFractionDigits:2});
const decimal=n=>Number(n).toLocaleString("en-HK",{maximumFractionDigits:6});
const multiplierText=n=>Number(n).toLocaleString("en-HK",{maximumFractionDigits:15});
// A tab name is a source identifier, not confirmation of withdrawal timing.
const planLabel=p=>p.id==="rollover"?"自動滾存（不提取）":"第"+p.startYear+"年開始每年提取本金"+decimal(p.rate*100)+"%";
const plan=id=>data.plans.find(p=>p.id===id);
const exact=(p,year)=>p.balances.find(r=>r[0]===year)?.[1]??null;
function validateSnapshot(snapshot){
 const expected=[["year5","5year 6%",0.06,5],["year7","7year 6.5%",0.065,7],["year9","9year 7%",0.07,9],["year11","11year 8%",0.08,11],["rollover","自動滾存",0,null]];
 if(!snapshot || snapshot.dataMode!=="verified-manual-snapshot" || !Array.isArray(snapshot.plans) || snapshot.plans.length!==expected.length)return false;
 return expected.every(([id,sheet,rate,startYear],i)=>{const p=snapshot.plans[i];if(!p || p.id!==id || p.sheet!==sheet || p.rate!==rate || p.startYear!==startYear || !Array.isArray(p.balances) || !p.balances.length)return false;let previous=0;return p.balances.every(row=>{if(!Array.isArray(row) || row.length!==2 || !Number.isSafeInteger(row[0]) || row[0]<=previous || !Number.isFinite(row[1]) || row[1]<=0)return false;previous=row[0];return true})});
}
let snapshotValid=validateSnapshot(data);
let years=snapshotValid?[...new Set(data.plans.flatMap(p=>p.balances.map(r=>r[0])))].sort((a,b)=>a-b):[];
const amountField=(id,label,val,min=1)=>'<label for="'+id+'">'+label+'</label><div class="money-input">'+(id==="capital"?'<span aria-hidden="true">HK$</span>':'')+'<input id="'+id+'" inputmode="decimal" type="text" value="'+decimal(val)+'" data-min="'+min+'">'+(id==="bankRate"?'<span aria-hidden="true">%</span>':id==="bankYears"?'<span aria-hidden="true">年</span>':'')+'</div>';
const metric=(name,value)=>'<div class="metric"><span>'+name+'</span><strong>'+value+'</strong></div>';
function entryMode(search){
 const values=new URLSearchParams(search).getAll("avaEntry");
 if(values.includes("admin"))return "admin";
 if(values.includes("user"))return "user";
 return "frontend";
}
function annualPresentation(p,v,project){
 return '<div class="result-card"><span class="card-kicker">第 '+state.term+' 年 · '+escapeText(p.sheet)+'</span><strong>'+(project===null?'無此年度數據':'HK$ '+money(project))+'</strong><span>'+(v===null?'此安排沒有提供此年度。':'一次性投入 × 結餘倍數 '+multiplierText(v))+'</span></div><details class="annual-details"><summary>__OFFICIAL_P5_DETAILS__</summary><div class="table-wrap" tabindex="0" role="region" aria-label="年度結餘表"><table><thead><tr><th>保單年度</th><th>每年提取百分比</th><th>結餘倍數</th><th>預計結餘 HK$</th></tr></thead><tbody>'+p.balances.map(([year,multiplier])=>'<tr><td>'+year+' 年</td><td>'+decimal(p.rate*100)+'%</td><td>'+multiplierText(multiplier)+'×</td><td>'+money(state.capital*multiplier)+'</td></tr>').join('')+'</tbody></table></div></details><p class="calculation-note">__OFFICIAL_EXACT_YEAR__ __OFFICIAL_PAYOUT_NOT_VERIFIED__</p>';
}

const SALES_PAGE_NAMES=["累積財富的安排","理想資金效果","加入時間","同一筆錢的比較","計劃如何操作","時間會帶到邊","中途領取效果"];
const methodChoices=[
 ["bank","銀行／現金","保持靈活，隨時有需要可以使用。"],
 ["fixed","定期／債券","先收取利息，日後再考慮其他安排。"],
 ["invest","股票／基金","以市場投資作資產增長。"],
 ["other","儲蓄計劃","以儲蓄計劃作長遠安排。"]
];
const purposeChoices=[
 ["flex","保持靈活","需要用時可以比較容易處理。"],
 ["grow","希望資金增長","時間拉長，資源可以慢慢增加。"],
 ["income","收息／現金流","希望日後可以有持續收入。"],
 ["future","為將來準備","留一筆資源作長期規劃。"]
];
const moneyHK=n=>"HK$ "+money(n);
const officialEntry=(id,fallback)=>escapeText(officialContent.entries.find(r=>r[0]===id)?.[3]||fallback);
const salesTitle=(id,fallback)=>{const current=officialContent.entries.find(r=>r[0]===id)?.[3],original=bundledData.content.entries.find(r=>r[0]===id)?.[3];return escapeText(current&&current!==original?current:fallback)};
const showAge=year=>Number.isInteger(state.currentAge)?(state.currentAge+Number(year))+"歲":"第 "+Number(year)+" 年";
const yearValue=year=>Number(year);
const bankForYear=year=>state.capital*Math.pow(1+state.bankRate/100,Number(year));
const projectAt=(p,year)=>{const factor=exact(p,Number(year));return factor===null?null:state.capital*factor};
const safeOutcome=(v)=>v===null?"—":moneyHK(v);
const comparison=(year)=>{const bank=bankForYear(year),saving=projectAt(plan(state.plan),year),diff=saving===null?null:saving-bank;return {bank,saving,diff}};
const titleBlock=(code,title,subtitle)=>'<div class="flow-context"><div class="eyebrow">'+code+' · 對話進行中</div><h1>'+title+'</h1><p>'+subtitle+'</p></div>';
const optionCards=(items,field,icon)=>'<div class="conversation-grid">'+items.map(([id,name,desc])=>'<button type="button" class="ava-card ava-card--interactive" data-'+field+'="'+id+'" aria-pressed="'+(state[field]===id)+'"><span class="card-icon" aria-hidden="true">'+icon+'</span><span><strong>'+escapeText(name)+'</strong><small>'+escapeText(desc)+'</small></span></button>').join('')+'</div>';
const ageRail=(key,items,selected,attribute="data-year")=>'<div class="time-bar-card timeline-rail-card"><div class="time-bar-heading"><span>向左右探索'+(key==="start"?"開始使用年齡":"年齡")+'</span><span>左右滑動查看更多</span></div><div class="timeline-rail" role="listbox" aria-label="年齡和保單年度">'+items.map(year=>'<button type="button" role="option" class="timeline-rail__item'+(Number(year)===Number(selected)?" is-selected":"")+'" '+attribute+'="'+year+'" aria-selected="'+(Number(year)===Number(selected))+'"><strong>'+showAge(year)+'</strong><small>第 '+year+' 年'+(key==="start"?"開始":"")+'</small></button>').join('')+'</div></div>';
const arrangementOptions=[["rollover","自動滾存（不提取）"],["year5","第5年起領 6%"],["year7","第7年起領 6.5%"],["year9","第9年起領 7%"],["year11","第11年起領 8%"]];
const withdrawalStartRail=()=>'<div class="time-bar-card timeline-rail-card"><h3>選擇回報安排</h3><div class="timeline-rail" role="listbox" aria-label="選擇回報安排">'+arrangementOptions.map(([id,label])=>'<button type="button" role="option" class="timeline-rail__item'+(state.plan===id?' is-selected':'')+'" data-withdraw-start="'+id+'" aria-selected="'+(state.plan===id)+'"><strong>'+label+'</strong></button>').join('')+'</div></div>';
const cardsCompare=(year)=>{const o=comparison(year);return '<div class="same-money"><span>同樣投入本金 · 第'+year+'年 · '+showAge(year)+'</span><strong>'+moneyHK(state.capital)+'</strong></div><div class="p4-simple-outcomes" data-comparison-year="'+year+'"><div class="p4-simple-outcome"><span>維持銀行存款 · 假設</span><strong>'+moneyHK(o.bank)+'</strong></div><div class="p4-simple-outcome p4-simple-outcome--saving"><span>One-Time-Off 結餘</span><strong>'+safeOutcome(o.saving)+'</strong></div></div>'};
const comparisonBars=(year)=>{const o=comparison(year),den=Math.max(o.bank,o.saving||0,1);const bar=(title,value,kind)=>'<div class="p4-bar-title"><strong>'+title+'</strong><strong>'+safeOutcome(value)+'</strong></div><div class="p4-colored-bar"><span class="p4-color-'+kind+'" style="width:'+(value===null?0:Math.max(0,Math.min(100,value/den*100)))+'%"></span></div>';const signed=o.diff===null?'—':(o.diff<0?'-':'+')+'HK$'+money(Math.abs(o.diff));return '<div class="p4-visual-story"><h3>同一筆錢，不同安排</h3>'+bar("維持銀行存款",o.bank,"bank")+bar("One-Time-Off 結餘",o.saving,"saving")+'</div><div class="p4-total-difference"><span>預期未來可能的差額</span><strong>'+signed+'</strong></div>'};
const annualYears=()=>plan(state.plan).balances.map(r=>r[0]);
const withdrawalYears=()=>{const p=plan(state.plan),first=p.startYear??p.balances[0][0];return p.balances.map(r=>r[0]).filter(y=>y>=first)};
const cashflowAt=(p,year)=>{if(p.id==="rollover"||year<(p.startYear??Infinity))return {annual:0,cumulative:0};const annual=state.capital*p.rate;return {annual,cumulative:annual*(year-p.startYear+1)}};

// 5PAY-style customer summary is a presentation state after P7, not an
// additional Official data page; it never changes the seven-page Sheet contract.
function customerSummary(){
 const p=plan(state.plan),year=state.withdrawalYear,account=projectAt(p,year),cashflow=cashflowAt(p,year);
 const method=methodChoices.find(x=>x[0]===state.method)?.[1]||"未選擇";
 const purpose=purposeChoices.find(x=>x[0]===state.purpose)?.[1]||"未選擇";
 const values=[
  ["目前安排",escapeText(method)],
  ["今次一次性投入",moneyHK(state.capital)],
  ["選擇回報安排",escapeText(arrangementOptions.find(x=>x[0]===state.plan)?.[1]||p.sheet)],
  ["探索時間",showAge(year)+" · 第 "+year+" 年"],
  ["預計保單結餘",safeOutcome(account)],
  ["每年可使用",moneyHK(cashflow.annual)],
  ["累積已使用",moneyHK(cashflow.cumulative)]
 ];
 return '<section class="customer-summary" data-ava-mode="presentation"><div class="flow-context"><div class="eyebrow">總結 · 客戶展示</div><h1>現有安排 ＋ 一次性儲蓄規劃</h1><p>根據今次選擇，整理投入、時間同預計保單結餘。</p></div>'
 +'<div class="customer-summary__grid">'+values.map(([label,value],i)=>'<div class="ava-card customer-summary__item'+(i===4?' customer-summary__item--accent':'')+'"><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</div>'
 +'<p class="withdrawal-source-note">目標：'+escapeText(purpose)+'。保單結餘根據 '+escapeText(p.sheet)+' 所提供嘅第 '+year+' 年結餘倍數計算。資料為非即時文件來源快照，並非保證收益。每年提取額以一次性投入本金乘對應比例計算，累積額按起領年度逐年累計；預期退保價值沿用指定年度的文件倍數，包含非保證部分。</p>'
 +'<div class="actions ava-front__actions"><button type="button" class="primary ava-button ava-button--primary" id="print-summary">列印／儲存 PDF</button><button type="button" class="secondary ava-button ava-button--secondary" id="back-to-p7">返回對話</button></div></section>';
}

const inputCard=(id,label,value)=>'<label class="ava-label" for="'+id+'">'+label+'</label><div class="money-input">'+(id==="capital"?'<span>HK$</span>':"")+'<input id="'+id+'" inputmode="'+(id==="currentAge"?"numeric":"decimal")+'" type="text" value="'+(value==null?"":decimal(value))+'" placeholder="'+(id==="currentAge"?"例如 40":id==="capital"?"例如 500000":"例如 1.5")+'">'+(id==="bankRate"?'<span>%</span>':"")+'</div>';
function bodyRaw(){
const p=plan(state.plan),year=state.term, projected=projectAt(p,year);
switch(state.step){
case 0:
 return titleBlock("P1",salesTitle("P1_TITLE","累積落嚟嘅財富，你通常會點處理？"),"先了解你平時點樣安排已經累積嘅資金。")
  +optionCards(methodChoices,"method","○")+'<p data-edit-paragraph="0"></p>';
case 1:
 return titleBlock("P2",salesTitle("P2_TITLE","呢種安排，你通常希望做到邊種效果？"),"了解你希望累積落嚟嘅財富為將來做到啲咩。")
  +optionCards(purposeChoices,"purpose","✦")+'<p data-edit-paragraph="1"></p>';
case 2:
 return titleBlock("P3",salesTitle("P3_TITLE","如果將時間加落去呢？"),"睇下你而家嘅資金，隨住時間會去到邊。")
  +'<div class="ava-card input-card p3-wealth-inputs">'
  +'<div class="input-section"><h3>你而家幾多歲？</h3>'+inputCard("currentAge","由目前歲數開始，顯示日後各個時間點的歲數。",state.currentAge)+'</div>'
  +'<div class="input-section"><h3>目前累積財富</h3>'+inputCard("capital",officialEntry("P2_AMOUNT","現有資金"),state.capital)+'</div>'
  +'<div class="input-section"><h3>目前銀行存款</h3>'+inputCard("bankRate",officialEntry("P3_RATE","銀行年息（可留空）"),state.bankRate)+'</div>'
  +'</div>';
case 3:
 return titleBlock("P4",salesTitle("P4_TITLE","如果同一筆錢，有另一種安排呢？"),"同一筆投入，睇下時間可以帶嚟咩變化。")
  +'<div class="comparison-intro"><strong>以 '+showAge(year)+' · 第 '+year+' 年探索時間</strong></div>'
  +ageRail("compare",years,year)+cardsCompare(year)+comparisonBars(year);
case 4:
 return titleBlock("P5",salesTitle("P5_TITLE","原來係咁運作"),"一次投入，開始安排未來。")
  +'<section class="ava-card saving-phase"><h2>第一期 One-Time-Off 安排</h2><div class="phase-flow">'
  +'<div class="phase-step"><span class="phase-step-number">1</span><div><span>一次性投入本金</span><strong>'+moneyHK(state.capital)+'</strong></div></div>'
  +'<div class="phase-flow-arrow" aria-hidden="true">↓</div>'
  +'<div class="phase-step"><span class="phase-step-number">2</span><div><span>由第 1 年開始安排</span></div></div>'
  +'<div class="phase-flow-arrow" aria-hidden="true">↓</div>'
  +'<div class="phase-step"><span class="phase-step-number">3</span><div><span>總投入</span><strong>'+moneyHK(state.capital)+'</strong></div></div>'
  +'</div></section>';
case 5:
 return titleBlock("P6",salesTitle("P6_TITLE","時間會帶到邊？"),"拉動時間，睇下唔同年份已有嘅官方結餘結果。")
  +'<div class="anchor-metric"><span>截至呢個時間點已投入 · '+showAge(year)+' · 第'+year+'年</span><strong>'+moneyHK(state.capital)+'</strong></div>'
  +ageRail("saving",annualYears(),year)
  +'<div class="result-card"><span class="card-kicker">One-Time-Off 保單結餘 · '+showAge(year)+'</span><strong>'+safeOutcome(projected)+'</strong></div>';

default:
 return titleBlock("P7",salesTitle("P7_TITLE","如果中途開始用呢？"),"選擇安排，再探索不同年齡的效果。")
  +withdrawalStartRail()
  +'<h3>探索年齡及保單年度</h3>'
  +(state.currentAge===null?'<div class="withdrawal-age-prompt"><p>請輸入目前歲數，以查看對應年齡；未填時先顯示保單年度。</p>'+inputCard("currentAge","目前歲數",state.currentAge)+'</div>':"")
  +ageRail("withdrawal",withdrawalYears(),state.withdrawalYear,"data-withdraw-year")
  +'<div class="withdrawal-result"><div><span>每年可使用</span><strong>'+moneyHK(cashflowAt(p,state.withdrawalYear).annual)+'</strong></div><div><span>累積已使用</span><strong>'+moneyHK(cashflowAt(p,state.withdrawalYear).cumulative)+'</strong></div><div><span>當時退保價值</span><strong>'+safeOutcome(projectAt(p,state.withdrawalYear))+'</strong></div></div>'
  +(state.plan==='rollover'?'':'<p class="withdrawal-source-note">每年領取按一次性本金 × '+decimal(p.rate*100)+'% 計算，從第 '+p.startYear+' 保單年度開始累計；退保價值依據該方案的文件來源結餘倍數，屬預期非保證金額。</p>')
  +'<p data-edit-paragraph="2"></p>';

}
}

// Official text is inserted by stable Sheet ID, before User overrides are applied.
function body(){
 let html=bodyRaw();
 for(const group of ['entries','disclosures'])for(const row of officialContent[group])html=html.split('__OFFICIAL_'+row[0]+'__').join(escapeText(row[3]));
 if(state.step===2){const note=officialContent.entries.find(r=>r[0]==='P3_NOTE')[3],bank=disclosure('BANK_SCENARIO');html=html.replace('__OFFICIAL_BANK_NOTES__',escapeText(note)+(bank===note?'':'</p><p class="note">'+escapeText(bank)))}
 return html;
}
function validateCurrent(){
  return [$("#currentAge"),$("#capital"),$("#bankRate"),$("#bankYears")].every(field=>!field || field.reportValidity());
}
function bindNumber(field,key,min,max,places){
  const update=()=>{
    const raw=field.value.replace(/,/g,"");
    const valid=/^(?:\d+\.?\d*|\.\d+)$/.test(raw) && Number.isFinite(Number(raw)) && Number(raw)>=min && Number(raw)<=max && (!raw.includes(".") || raw.split(".")[1].length<=places);
    field.setCustomValidity(valid?"":"請輸入有效數值（"+min+" 至 "+max.toLocaleString("en-HK")+"，最多 "+places+" 位小數）。");
    field.setAttribute("aria-invalid",String(!valid));
    if(!valid)return;
    state[key]=Number(raw);
    if(key==="bankYears")state.term=state.bankYears;
    if(key==="capital"){const shown=document.querySelector("#app .anchor-metric strong");if(shown)shown.textContent=moneyHK(state.capital)}
    if(key==="bankRate" || key==="bankYears"){const card=document.querySelector("#app .bank-live-metrics .metric:nth-child(2)");if(card){card.querySelector("span").textContent="假設 "+state.bankYears+" 年後銀行結餘";card.querySelector("strong").textContent="HK$ "+money(state.capital*(1+state.bankRate/100)**state.bankYears)}}
    const cursor=field.selectionStart;
    const before=field.value.slice(0,cursor).replace(/,/g,"").length;
    const parts=raw.split(".");
    field.value=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,",")+(parts.length>1?"."+parts[1]:"");
    let i=0,count=0;while(i<field.value.length && count<before){if(field.value[i]!==",")count++;i++}
    field.setSelectionRange(i,i);
  };
  field.addEventListener("input",update);
}
function mediaHtml(media){if(!validMedia(media)||!media)return "";return media.startsWith("data:image/")?'<img class="custom-media" alt="自訂頁圖片" src="'+media+'">':'<video class="custom-media" controls preload="metadata" src="'+media+'"></video>'}
function disclosure(id){return officialContent.disclosures.find(row=>row[0]===id)?.[3]||""}
function updateSourceDisplay(){
 const sourceNote=$("#official-source-note");if(sourceNote)sourceNote.textContent=disclosure("SOURCE_NOTE");
 const entry=entryMode(window.location.search),panel=$("#source-diagnostics");const diagnosticSection=$("#technical-status");if(diagnosticSection)diagnosticSection.hidden=entry!=="user"||previewUser;
 if(panel)panel.hidden=entry!=="user"||previewUser;
 const node=$("#source-status");if(node){const labels={snapshot:"手動快照：非即時，新鮮度未確認",cached:"本機快取：非即時",live:"已連接資料來源"};node.textContent=(labels[officialStatus.mode]||"資料不可用")+(officialStatus.revision?" · 版本 "+officialStatus.revision.slice(0,12):"")+(officialStatus.publishedAt?" · 資料時間 "+officialStatus.publishedAt:"")+(officialStatus.stale?" · 資料時間超過 7 日，請核實":"")+(officialStatus.error?" · 更新失敗":"")+(data.content?"":" · 官方內容使用非即時快照")}
 if(!panel)return;
 const values={mode:({live:"LIVE · 來源讀取",cached:"CACHED · 本機快取",snapshot:"SNAPSHOT · 手動快照"})[officialStatus.mode]||"不可用",time:officialStatus.publishedAt||lastSuccessfulRead||"未有可用記錄",revision:officialStatus.revision||"未有可用記錄",result:officialStatus.error?"失敗，已使用可用後備資料":officialStatus.mode==="live"?"成功":OFFICIAL_ENDPOINT?"尚未成功":"未設定來源",freshness:officialStatus.stale?"過期：來源讀取已超過 7 日":officialStatus.mode==="live"?"目前：最近一次來源讀取（非產品資料更新保證）":"不可確認：並非目前來源讀取"};
 for(const [key,value] of Object.entries(values)){const el=$("#diag-"+key);if(el)el.textContent=value}
}
function render(){
const routeEntry=entryMode(window.location.search),entry=routeEntry==="user"&&previewUser?"frontend":routeEntry;
const returnLink=$("#return-ava");if(returnLink)returnLink.href="https://ivancww.github.io/avaplatform/"+(routeEntry==="user"?"?avaSurface=user":"");
if(entry==="admin"){
 $("#mode").textContent="功能未開放";$("#flow-progress").textContent="";
 $("#app").innerHTML='<h1>此功能尚未開放</h1><p>'+(entry==="admin"?"官方資料管理尚未啟用，網址本身不提供管理權限。":"個人內容編輯尚未啟用，現時無法儲存修改。")+'</p><a class="secondary entry-link" href="./">返回銷售展示</a>';return;
}
if(!snapshotValid){$("#mode").textContent="資料不可用";$("#flow-progress").textContent="";$("#app").innerHTML='<h1>資料暫時不可用</h1><p>資料快照未通過檢查，投影已停用。請聯絡管理人員確認資料來源。</p>';return}
if(entry==="user" && !userReady){$("#mode").textContent="個人編輯";$("#flow-progress").textContent="";$("#app").innerHTML='<h1>個人編輯不可用</h1><p>無法讀取本機資料；請檢查瀏覽器儲存設定。</p><a href="./">返回銷售展示</a>';return}

updateSourceDisplay();
if(showSummary){
 $("#mode").textContent="總結 · 客戶展示";
 $("#flow-progress").textContent="總結 · 客戶展示";
 $("#back").disabled=false;
 $("#back").onclick=()=>{showSummary=false;render()};
 $("#app").innerHTML=customerSummary();
 $("#back-to-p7").onclick=()=>{showSummary=false;render()};
 $("#print-summary").onclick=()=>window.print();
 return;
}
$("#mode").textContent=routeEntry==="user"&&previewUser?"預覽草稿 · 本機資料":entry==="user"?"個人編輯 · 本機資料":"";
const activeUser=routeEntry==="user"?userDraft:userSaved;
const flow=[];for(let i=0;i<7;i++){flow.push({key:String(i),label:SALES_PAGE_NAMES[i]});activeUser.customPages.filter(p=>p.after===i&&(entry==="user"||p.visible)).forEach(p=>flow.push({key:p.id,label:p.title||"自訂頁"}))}
let currentKey=customPageId||String(state.step);if(!flow.some(p=>p.key===currentKey)){customPageId=null;currentKey=String(state.step)}
const at=flow.findIndex(p=>p.key===currentKey),custom=customPageId?activeUser.customPages.find(p=>p.id===customPageId):null;
$("#flow-progress").dataset.pageKey=currentKey;$("#flow-progress").dataset.pageIndex=String(at);$("#flow-progress").textContent="第 "+(at+1)+" / "+flow.length+" 頁 · "+flow[at].label+(custom&&entry==="user"&&!custom.visible?"（隱藏）":"");
let renderedBody;if(custom){renderedBody=entry==="user"?'<label for="custom-title">自訂頁標題</label><input id="custom-title" maxlength="120" value="'+escapeText(custom.title)+'"><label for="custom-text">自訂頁內容</label><textarea id="custom-text" maxlength="2000">'+escapeText(custom.text)+'</textarea><label for="custom-after">插入位置</label><select id="custom-after">'+SALES_PAGE_NAMES.map((n,i)=>'<option value="'+i+'" '+(custom.after===i?'selected':'')+'>'+escapeText(n)+'之後</option>').join('')+'</select><label><input type="checkbox" id="custom-visible" '+(custom.visible?'checked':'')+'> 前台顯示此頁</label><button type="button" id="custom-up" class="secondary">向前排序</button> <button type="button" id="custom-down" class="secondary">向後排序</button> <button type="button" id="custom-remove" class="secondary">刪除此自訂頁</button>':'<h1>'+escapeText(custom.title||"自訂頁")+'</h1><p class="custom-text">'+escapeText(custom.text)+'</p>'+mediaHtml(custom.media)}else{
 renderedBody=body().replace(/<h1>([^<]*)<\/h1>/,(_,original)=>{const chosen=activeUser.titles[state.step]?escapeText(activeUser.titles[state.step]):original;return entry==="user"?'<h1 class="inline-edit" id="page-title" contenteditable="plaintext-only" role="textbox" aria-label="編輯本頁標題" aria-multiline="false">'+chosen+'</h1>':'<h1>'+chosen+'</h1>'});
 renderedBody=renderedBody.replace(/<p data-edit-paragraph="(\d)">([^<]*)<\/p>/g,(_,index,original)=>{const chosen=activeUser.paragraphs[Number(index)]?escapeText(activeUser.paragraphs[Number(index)]):original;return entry==="user"?'<p class="inline-edit" data-paragraph="'+index+'" id="paragraph-'+index+'" contenteditable="plaintext-only" role="textbox" aria-label="編輯本段說明" aria-multiline="true">'+chosen+'</p>':activeUser.paragraphs[Number(index)]?'<p>'+chosen+'</p>':''});
}
$("#back").disabled=at===0;
$("#app").innerHTML=renderedBody+userNote()+(entry==="user"?'<div class="user-actions"><p role="status" id="user-status">'+escapeText(userError)+'</p><button id="preview-user" class="secondary">預覽草稿</button> <button id="add-page" class="secondary">新增自訂頁</button> <button id="restore-page" class="secondary" '+(userDraft.deletedPages.length?'':'disabled')+'>還原已刪頁面</button> <button id="save-user" class="primary">儲存至本機</button> <button id="cancel-user" class="secondary">取消修改</button> <button id="export-user" class="secondary">匯出已儲存內容</button> <label for="import-user">匯入個人內容（先作草稿）</label><input id="import-user" type="file" accept="application/json,.json"><p class="note">'+escapeText(disclosure("OFFICIAL_USER"))+' 請勿輸入客戶個人資料。</p></div>':'')+(routeEntry==="user"&&previewUser?'<p id="user-status" role="status">'+escapeText(userError)+'</p><button id="exit-preview" class="secondary">返回編輯</button> <button id="save-preview" class="primary">儲存至本機</button>':'')+'<div class="actions ava-front__actions"><button type="button" class="primary ava-button ava-button--primary" id="next">'+("下一步")+'</button></div>';
function go(key){if(!validateCurrent())return;showSummary=false;if(/^u-/.test(key)){customPageId=key}else{customPageId=null;state.step=Number(key)}render()}

document.querySelectorAll("[data-method]").forEach(b=>b.onclick=()=>{state.method=b.dataset.method;go("1")});
document.querySelectorAll("[data-purpose]").forEach(b=>b.onclick=()=>{state.purpose=b.dataset.purpose;go("2")});
document.querySelectorAll("[data-bank-year]").forEach(b=>b.onclick=()=>{state.bankYears=Number(b.dataset.bankYear);state.term=state.bankYears;render();document.querySelector('[data-bank-year="'+state.bankYears+'"]')?.focus()});
document.querySelectorAll("[data-goal]").forEach(b=>b.onclick=()=>{const i=+b.dataset.goal;state.goals=state.goals.includes(i)?state.goals.filter(x=>x!==i):[...state.goals,i];b.setAttribute("aria-pressed",state.goals.includes(i))});
document.querySelectorAll("[data-year]").forEach(b=>b.onclick=()=>{state.term=Number(b.dataset.year);state.bankYears=state.term;render();document.querySelector(`[data-year="${state.term}"]`)?.focus()});
document.querySelectorAll("[data-withdraw-start]").forEach(b=>b.onclick=()=>{state.plan=b.dataset.withdrawStart;state.withdrawalYear=withdrawalYears()[0];render();document.querySelector(`[data-withdraw-start="${state.plan}"]`)?.focus()});
document.querySelectorAll("[data-withdraw-year]").forEach(b=>b.onclick=()=>{state.withdrawalYear=Number(b.dataset.withdrawYear);render();document.querySelector(`[data-withdraw-year="${state.withdrawalYear}"]`)?.focus()});
document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{state.plan=b.dataset.choice;render()});
$("#back").onclick=()=>{if(at>0)go(flow[at-1].key)};$("#next").onclick=()=>{if(at<flow.length-1)go(flow[at+1].key);else if(validateCurrent()){showSummary=true;render()}};
async function saveUserDraft(){if(userSaving)return;userSaving=true;const snapshot=cloneUser(userDraft);try{await writeUserData(snapshot);userSaved=snapshot;userDirty=userChanged();userError=userDirty?"已儲存較早版本，較新的修改仍未儲存。":"已儲存並核對本機資料。"}catch(e){userError="儲存失敗，草稿仍保留；請重試。"}finally{userSaving=false}render();return !userDirty && !userError.includes("儲存失敗")}
if(typeof window!=="undefined")window.__avaSaveUserDraft=entry==="user"?saveUserDraft:null;
if(entry==="user"){
 $("#preview-user").onclick=()=>{if(!validateCurrent())return;previewUser=true;render()};
 const note=$("#user-note"),key=state.step===0?"introNote":"summaryNote";
 if(note)note.oninput=()=>{userDraft[key]=note.value;userDirty=userChanged()};
 if(!custom){$("#page-title").oninput=e=>{const text=e.target.textContent.slice(0,120);if(e.target.textContent!==text)e.target.textContent=text;userDraft.titles[state.step]=text;userDirty=userChanged()};document.querySelectorAll("[data-paragraph]").forEach(el=>el.oninput=()=>{const text=el.textContent.slice(0,2000);if(el.textContent!==text)el.textContent=text;userDraft.paragraphs[Number(el.dataset.paragraph)]=text;userDirty=userChanged()})}
 $("#restore-page").onclick=()=>{const restored=userDraft.deletedPages.pop();if(restored){userDraft.customPages.push(restored);customPageId=restored.id;userDirty=userChanged();render()}};
 $("#add-page").onclick=()=>{if(userDraft.customPages.length+userDraft.deletedPages.length>=20){userError="最多新增 20 頁。";render();return}const id='u-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);userDraft.customPages.push({id,title:"自訂頁",text:"",after:custom?custom.after:state.step,visible:true,media:""});customPageId=id;userDirty=userChanged();render()};
 if(custom){for(const [sel,key] of [["#custom-title","title"],["#custom-text","text"]])$(sel).oninput=e=>{custom[key]=e.target.value;userDirty=userChanged()};$("#custom-after").onchange=e=>{custom.after=Number(e.target.value);userDirty=userChanged();render()};$("#custom-visible").onchange=e=>{custom.visible=e.target.checked;userDirty=userChanged();render()};for(const [sel,dir] of [["#custom-up",-1],["#custom-down",1]])$(sel).onclick=()=>{const list=userDraft.customPages,idx=list.indexOf(custom),other=dir<0?list.map(p=>p.after).lastIndexOf(custom.after,idx-1):list.findIndex((p,i)=>i>idx&&p.after===custom.after);if(other>=0&&other<list.length){[list[idx],list[other]]=[list[other],list[idx]];userDirty=userChanged();render()}};$("#custom-remove").onclick=()=>{if(!window.confirm("刪除此自訂頁？"))return;userDraft.deletedPages.push(custom);userDraft.customPages=userDraft.customPages.filter(p=>p.id!==customPageId);customPageId=null;userDirty=userChanged();render()}}
 $("#save-user").onclick=saveUserDraft;
 $("#cancel-user").onclick=()=>{if(userDirty && !window.confirm("放棄未儲存的修改？"))return;userDraft=cloneUser(userSaved);customPageId=null;userDirty=false;userError="已放棄草稿。";render()};
 $("#export-user").onclick=()=>{const blob=new Blob([JSON.stringify({format:"ava-one-time-off-user",version:5,content:userSaved},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ava-one-time-off-user.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $("#import-user").onchange=async e=>{try{const file=e.target.files[0];if(!file || file.size>6000000)throw Error();const v=JSON.parse(await file.text());if(!v || v.format!=="ava-one-time-off-user" || (v.version!==1 && v.version!==2 && v.version!==3 && v.version!==4 && v.version!==5) || (v.version===1?!validLegacyUserData(v.content):v.version===2?!validV2(v.content):v.version===3?!validV3(v.content):v.version===4?!validV4(v.content):!validUserData(v.content)))throw Error();if(userDirty && !window.confirm("以匯入內容取代未儲存草稿？")){e.target.value="";return}userDraft=migrateUserData(v.content);userDirty=userChanged();userError="匯入草稿後，請檢查並儲存至本機。"}catch(err){userError="匯入失敗；原有內容未變。"}render()};
}
const savePreview=$("#save-preview");if(savePreview)savePreview.onclick=saveUserDraft;
const exitPreview=$("#exit-preview");if(exitPreview)exitPreview.onclick=()=>{previewUser=false;render()};
const cap=$("#capital");if(cap)bindNumber(cap,"capital",1,1000000000000,2);
const age=$("#currentAge");if(age)age.addEventListener("input",()=>{const raw=age.value.trim();const valid=/^\d{1,3}$/.test(raw)&&Number(raw)>=0&&Number(raw)<=120;age.setCustomValidity(valid?"":"請輸入 0 至 120 歲的整數。");age.setAttribute("aria-invalid",String(!valid));if(valid)state.currentAge=Number(raw);});if(age && state.step===6)age.addEventListener("change",()=>{if(age.value.trim() && age.checkValidity())render()});
const rate=$("#bankRate");if(rate)bindNumber(rate,"bankRate",0,100,4);
const bankYears=$("#bankYears");if(bankYears)bindNumber(bankYears,"bankYears",1,100,0);
const arrangement=$("#arrangement");if(arrangement)arrangement.onchange=()=>{state.plan=arrangement.value;render()};
const term=$("#term");if(term)term.onchange=()=>{state.term=Number(term.value);state.bankYears=state.term;render()};
const print=$("#print");if(print)print.onclick=()=>window.print();
}
let refreshingOfficial=null;
function refreshOfficial(){
 if(refreshingOfficial)return refreshingOfficial;
 refreshingOfficial=(async()=>{try{officialStatus=await loadOfficialData({snapshot:bundledData,endpoint:OFFICIAL_ENDPOINT,cache:officialCache});if(officialStatus.publishedAt)lastSuccessfulRead=officialStatus.publishedAt;data=officialStatus.data;officialContent=data.content||bundledData.content;officialContent.pages.forEach((p,i)=>{names[i]=p[2]});officialContent.entries.filter(r=>/^P1_GOAL[1-4]$/.test(r[0])).forEach((r,i)=>{goalLabels[i]=r[3]});snapshotValid=validDataset(data);years=snapshotValid?[...new Set(data.plans.flatMap(p=>p.balances.map(r=>r[0])))].sort((a,b)=>a-b):[]}catch(e){snapshotValid=false;officialStatus={mode:"unavailable",error:true}}updateSourceDisplay()})().finally(()=>{refreshingOfficial=null});return refreshingOfficial;
}
if(typeof window!=="undefined" && typeof window.addEventListener==="function" && typeof document!=="undefined"){
 window.__avaHasUnsavedDraft=()=>userDirty || userSaving;
 window.addEventListener("beforeunload",e=>{if(userDirty){e.preventDefault();e.returnValue=""}});
 (async()=>{await refreshOfficial();try{const saved=await readUserData();if(saved!==undefined)userSaved=migrateUserData(saved);userDraft=cloneUser(userSaved);userReady=true}catch(e){userReady=false}render()})();
}

if(typeof window!=="undefined" && typeof navigator!=="undefined" && typeof document!=="undefined"){
 const network=()=>{const node=document.querySelector("#network-status");if(node)node.textContent=navigator.onLine?"網絡已連接":"離線模式：使用上次保存的程式及資料"};
 window.addEventListener("online",()=>{network();if(OFFICIAL_ENDPOINT)refreshOfficial().then(()=>{if(!userDirty)render()})});window.addEventListener("offline",()=>{network();if(OFFICIAL_ENDPOINT)refreshOfficial().then(()=>{if(!userDirty)render()})});network();
 if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1"))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{const node=document.querySelector("#network-status");if(node)node.textContent="離線功能暫時不可用"});
}

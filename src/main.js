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
const state={step:0,capital:500000,term:20,plan:"rollover",bankRate:1.5,bankYears:20,goals:[],method:"bank"};
const $=s=>document.querySelector(s);
// Only these user-owned notes are editable. Financial facts and disclosures are not.
const userPages=[0,1,2,3,4,5,6], userKeys=["introNote","summaryNote"];
const blankUser=()=>({introNote:"",summaryNote:"",titles:Array(7).fill(""),paragraphs:Array(3).fill(""),customPages:[],deletedPages:[]});
const cloneUser=value=>JSON.parse(JSON.stringify(value));
let customPageId=null, previewUser=false;
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
const planLabel=p=>p.id==="rollover"?"自動滾存（不提取）":"提取安排（來源分頁："+p.sheet+"）";
const plan=id=>data.plans.find(p=>p.id===id);
const exact=(p,year)=>p.balances.find(r=>r[0]===year)?.[1]??null;
function validateSnapshot(snapshot){
 const expected=[["year1","1year 4%"],["year3","3year 5%"],["year5","5year 6%"],["rollover","自動滾存"]];
 if(!snapshot || snapshot.dataMode!=="verified-manual-snapshot" || !Array.isArray(snapshot.plans) || snapshot.plans.length!==expected.length)return false;
 return expected.every(([id,sheet],i)=>{const p=snapshot.plans[i];if(!p || p.id!==id || p.sheet!==sheet || !Number.isFinite(p.rate) || p.rate<0 || p.rate>1 || !Array.isArray(p.balances) || !p.balances.length)return false;let previous=0;return p.balances.every(row=>{if(!Array.isArray(row) || row.length!==2 || !Number.isSafeInteger(row[0]) || row[0]<=previous || !Number.isFinite(row[1]) || row[1]<=0)return false;previous=row[0];return true})});
}
let snapshotValid=validateSnapshot(data);
let years=snapshotValid?[...new Set(data.plans.flatMap(p=>p.balances.map(r=>r[0])))].sort((a,b)=>a-b):[];
const amountField=(id,label,val,min=1)=>'<label for="'+id+'">'+label+'</label><input id="'+id+'" inputmode="decimal" type="text" value="'+decimal(val)+'" data-min="'+min+'">';
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
const SALES_PAGE_NAMES=["了解現有資金","銀行本金","銀行時間","現有安排結果","另一筆安排","同本金比較","總結"];
const methodChoices=[
 ["bank","銀行／現金","暫時留喺手上，方便需要時使用。"],
 ["fixed","定期","放一段時間，到期後再決定下一步。"],
 ["stock","股票／ETF","透過市場參與資產增長。"],
 ["bond","債券","關心利息與到期安排。"],
 ["planned","已有長期安排","已經有一部分資源為較長期準備。"],
 ["none","未有特別安排","有剩餘資金，但暫時未有固定做法。"]
];
const moneyHK=n=>"HK$ "+money(n);
const sharedYear=()=>Number(state.term);
const bankForYear=year=>state.capital*Math.pow(1+state.bankRate/100,year);
const bankInfo=year=>'<div class="path-card bank-future" data-bank-year="'+year+'"><div class="card-kicker">維持銀行存款 · 第 '+year+' 年</div><div class="bank-future-grid"><div><span class="ava-label">現有本金</span><strong>'+moneyHK(state.capital)+'</strong></div><div><span class="ava-label">銀行假設年利率</span><strong>'+decimal(state.bankRate)+'%</strong></div><div><span class="ava-label">假設 '+year+' 年後結餘</span><strong>'+moneyHK(bankForYear(year))+'</strong></div></div><p class="calculation-note">銀行部分只係用戶自行輸入的固定年息複息情境；非銀行實際報價，亦唔代表未來每年利率不變。</p></div>';
const yearRail=(p=null)=>'<div class="time-controls" role="group" aria-label="選擇相同比較年期">'+(p?p.balances.map(row=>row[0]):years).map(year=>'<button type="button" class="year-chip" data-year="'+year+'" aria-pressed="'+(Number(year)===sharedYear())+'"><strong>'+year+'</strong><small>年</small></button>').join('')+'</div>';
const sameMoneyHeader=(year=sharedYear())=>'<div class="same-money"><span>同一筆現有本金 · 第 '+year+' 年</span><strong>'+moneyHK(state.capital)+'</strong><small>銀行與 One-Time-Off 使用相同本金、相同年期；沒有新增加入的本金。</small></div>';
const compareCards=(p,year)=>{const factor=exact(p,year),value=factor===null?null:state.capital*factor,bank=bankForYear(year);
 return '<div class="p4-simple-outcomes" data-comparison-year="'+year+'"><div class="p4-simple-outcome"><span>現有銀行存款 · 假設</span><strong>'+moneyHK(bank)+'</strong><small>年息 '+decimal(state.bankRate)+'% · '+year+' 年複息</small></div><div class="p4-simple-outcome p4-simple-outcome--saving"><span>One-Time-Off · '+escapeText(planLabel(p))+'</span><strong>'+(value===null?'無此年度數據':moneyHK(value))+'</strong><small>'+(factor===null?'不可插值或推算未有年度':('官方提供結餘倍數 '+multiplierText(factor)+'×'))+'</small></div></div>'
 +'<div class="p4-total-difference"><span>兩種安排第 '+year+' 年的結餘差額（非總回報）</span><strong>'+(value===null?'—':(value-bank>=0?'+':'')+moneyHK(value-bank))+'</strong></div>'
 +'<p class="calculation-note">'+escapeText(disclosure("COMPARISON_NOTE"))+' '+escapeText(disclosure("EXACT_YEAR"))+'</p>';
};
function bodyRaw(){
const p=plan(state.plan),v=exact(p,sharedYear()),project=v===null?null:state.capital*v;
const bank=bankForYear(state.bankYears);
switch(state.step){
case 0:return '<div class="flow-context"><span class="eyebrow">P1 · 對話進行中</span><h1>平時多出嚟嘅錢，你通常會點安排？</h1><p data-edit-paragraph="0">如果換轉係你，你通常會點處理？</p></div><div class="conversation-grid">'+methodChoices.map(([id,title,description])=>'<button type="button" class="ava-card ava-card--interactive method-choice'+(state.method===id?' is-selected':'')+'" data-method="'+id+'" aria-pressed="'+(state.method===id)+'"><span class="card-icon" aria-hidden="true">○</span><span><strong>'+escapeText(title)+'</strong><small>'+escapeText(description)+'</small></span></button>').join('')+'</div><p data-edit-paragraph="1">你可以先講，我哋只係用呢個選擇幫手接住之後嘅畫面。</p><details class="optional-goals"><summary>你最關心資金邊方面？（可選多項）</summary><div class="cards">'+goalLabels.map((goal,i)=>'<button type="button" class="choice" data-goal="'+i+'" aria-pressed="'+state.goals.includes(i)+'">'+escapeText(goal)+'</button>').join('')+'</div></details>';
case 1:return '<div class="flow-context"><span class="eyebrow">P2 · 現有資金</span><h1>你而家大約有幾多錢放喺銀行？</h1><p>先計清楚目前已經有嘅一筆本金；唔係未來每年再供款。</p></div><div class="ava-card input-card"><div class="input-section input-section--existing"><h2>現有銀行資金</h2>'+amountField("capital","銀行／現金本金（HK$）",state.capital,1)+'</div></div><div class="anchor-metric"><span>目前持有資金</span><strong>'+moneyHK(state.capital)+'</strong></div><p class="quiet-note">'+escapeText(officialContent.entries.find(r=>r[0]==="P2_NOTE")?.[3]||"")+'</p>';
case 2:return '<div class="flow-context"><span class="eyebrow">P3 · 加入時間</span><h1>如果呢筆錢繼續放喺銀行，未來會有幾多？</h1><p>本金唔變，先由銀行年息假設同時間睇起。</p></div><div class="ava-card input-card"><div class="input-section input-section--existing"><h2>銀行情境</h2>'+amountField("bankRate","銀行假設年利率（%）",state.bankRate,0)+amountField("bankYears","想睇幾多年之後？",state.bankYears,1)+'</div></div><div class="grid bank-live-metrics">'+metric("同一筆銀行本金",moneyHK(state.capital))+metric("假設 "+state.bankYears+" 年後銀行結餘",moneyHK(bank))+'</div><p class="quiet-note">'+escapeText(disclosure("BANK_SCENARIO"))+'</p>';
case 3:return '<div class="flow-context"><span class="eyebrow">P4 · 原有安排</span><h1>同一筆錢，時間行落去會點？</h1><p>先睇維持銀行安排嘅模擬結果；再用同一筆本金睇另一種安排。</p></div>'+bankInfo(state.bankYears)+'<div class="resource-bridge"><div class="resource-card"><span>現時安排</span><strong>銀行存款</strong><small>現有本金 '+moneyHK(state.capital)+'</small></div><div class="bridge-plus" aria-hidden="true">→</div><div class="resource-card resource-card--new"><span>另一個可能安排</span><strong>One-Time-Off</strong><small>同一筆本金作比較，唔額外加本金</small></div></div><div class="ava-card input-card"><label for="arrangement">選擇 One-Time-Off 官方安排</label><select id="arrangement">'+data.plans.map(q=>'<option value="'+q.id+'" '+(state.plan===q.id?'selected':'')+'>'+escapeText(planLabel(q))+'</option>').join('')+'</select></div><p class="calculation-note">'+escapeText(disclosure("WITHDRAWAL_TERMS"))+'</p>';
case 4:return '<div class="flow-context"><span class="eyebrow">P5 · 加入另一種安排</span><h1>如果同一筆資金，改用 One-Time-Off 會點？</h1><p>先選取來源真正提供的年度，再比較同一段時間；唔插值，唔推算未提供的年度。</p></div>'+sameMoneyHeader()+yearRail(p)+compareCards(p,sharedYear())+annualPresentation(p,v,project);
case 5:return '<div class="flow-context"><span class="eyebrow">P6 · 公平對比</span><h1>同樣本金、同樣時間，兩個安排有咩分別？</h1><p>銀行只用你輸入的假設；One-Time-Off 只用官方表中已提供嘅結餘倍數。</p></div>'+sameMoneyHeader()+'<label for="term">選擇共同比較年期</label><select id="term">'+years.map(y=>'<option value="'+y+'" '+(y===sharedYear()?"selected":"")+'>'+y+' 年</option>').join('')+'</select>'+compareCards(p,sharedYear())+'<details class="annual-details"><summary>查看 One-Time-Off 四種安排在此年度的結餘</summary><div class="table-wrap" tabindex="0" role="region" aria-label="各方案結餘比較表"><table><thead><tr><th>安排</th><th>結餘倍數</th><th>預計結餘 HK$</th></tr></thead><tbody>'+data.plans.map(q=>{const x=exact(q,sharedYear());return '<tr><td>'+escapeText(planLabel(q))+'</td><td>'+(x===null?'—':multiplierText(x)+'×')+'</td><td>'+(x===null?'未有數據':money(x*state.capital))+'</td></tr>'}).join('')+'</tbody></table></div></details><p class="calculation-note">'+escapeText(disclosure("COMPARISON_NOTE"))+'</p>';
default:return '<div class="flow-context"><span class="eyebrow">P7 · 對話總結</span><h1>一筆本金，兩種未來安排</h1><p>重點係選擇適合資金用途、時間同流動需要嘅安排。</p></div>'+sameMoneyHeader() + compareCards(p,sharedYear())+'<div class="grid">'+metric("一次投入",moneyHK(state.capital))+metric("銀行年利率假設",decimal(state.bankRate)+"%")+metric("共同比較年期",sharedYear()+" 年")+metric("所選方案",escapeText(planLabel(p)))+'</div><p>客人關注：'+(state.goals.length?state.goals.map(i=>escapeText(goalLabels[i])).join("、"):"尚未選擇")+'</p><p data-edit-paragraph="2">__OFFICIAL_P7_NOTE__</p><button class="secondary" id="print">__OFFICIAL_P7_PRINT__</button><p class="note">__OFFICIAL_SUMMARY_NOTE__</p>';
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
  return [$("#capital"),$("#bankRate"),$("#bankYears")].every(field=>!field || field.reportValidity());
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
$("#mode").textContent=routeEntry==="user"&&previewUser?"預覽草稿 · 本機資料":entry==="user"?"個人編輯 · 本機資料":"";
const activeUser=routeEntry==="user"?userDraft:userSaved;
const flow=[];for(let i=0;i<7;i++){flow.push({key:String(i),label:SALES_PAGE_NAMES[i]});activeUser.customPages.filter(p=>p.after===i&&(entry==="user"||p.visible)).forEach(p=>flow.push({key:p.id,label:p.title||"自訂頁"}))}
let currentKey=customPageId||String(state.step);if(!flow.some(p=>p.key===currentKey)){customPageId=null;currentKey=String(state.step)}
const at=flow.findIndex(p=>p.key===currentKey),custom=customPageId?activeUser.customPages.find(p=>p.id===customPageId):null;
$("#flow-progress").dataset.pageKey=currentKey;$("#flow-progress").dataset.pageIndex=String(at);$("#flow-progress").textContent="第 "+(at+1)+" / "+flow.length+" 頁 · "+flow[at].label+(custom&&entry==="user"&&!custom.visible?"（隱藏）":"");
let renderedBody;if(custom){renderedBody=entry==="user"?'<label for="custom-title">自訂頁標題</label><input id="custom-title" maxlength="120" value="'+escapeText(custom.title)+'"><label for="custom-text">自訂頁內容</label><textarea id="custom-text" maxlength="2000">'+escapeText(custom.text)+'</textarea><label for="custom-after">插入位置</label><select id="custom-after">'+names.map((n,i)=>'<option value="'+i+'" '+(custom.after===i?'selected':'')+'>'+escapeText(n)+'之後</option>').join('')+'</select><label><input type="checkbox" id="custom-visible" '+(custom.visible?'checked':'')+'> 前台顯示此頁</label><button type="button" id="custom-up" class="secondary">向前排序</button> <button type="button" id="custom-down" class="secondary">向後排序</button> <button type="button" id="custom-remove" class="secondary">刪除此自訂頁</button>':'<h1>'+escapeText(custom.title||"自訂頁")+'</h1><p class="custom-text">'+escapeText(custom.text)+'</p>'+mediaHtml(custom.media)}else{
 renderedBody=body().replace(/<h1>([^<]*)<\/h1>/,(_,original)=>{const chosen=activeUser.titles[state.step]?escapeText(activeUser.titles[state.step]):original;return entry==="user"?'<h1 class="inline-edit" id="page-title" contenteditable="plaintext-only" role="textbox" aria-label="編輯本頁標題" aria-multiline="false">'+chosen+'</h1>':'<h1>'+chosen+'</h1>'});
 renderedBody=renderedBody.replace(/<p data-edit-paragraph="(\d)">([^<]*)<\/p>/g,(_,index,original)=>{const chosen=activeUser.paragraphs[Number(index)]?escapeText(activeUser.paragraphs[Number(index)]):original;return entry==="user"?'<p class="inline-edit" data-paragraph="'+index+'" id="paragraph-'+index+'" contenteditable="plaintext-only" role="textbox" aria-label="編輯本段說明" aria-multiline="true">'+chosen+'</p>':'<p>'+chosen+'</p>'});
}
$("#back").disabled=at===0;
$("#app").innerHTML=renderedBody+userNote()+(entry==="user"?'<div class="user-actions"><p role="status" id="user-status">'+escapeText(userError)+'</p><button id="preview-user" class="secondary">預覽草稿</button> <button id="add-page" class="secondary">新增自訂頁</button> <button id="restore-page" class="secondary" '+(userDraft.deletedPages.length?'':'disabled')+'>還原已刪頁面</button> <button id="save-user" class="primary">儲存至本機</button> <button id="cancel-user" class="secondary">取消修改</button> <button id="export-user" class="secondary">匯出已儲存內容</button> <label for="import-user">匯入個人內容（先作草稿）</label><input id="import-user" type="file" accept="application/json,.json"><p class="note">'+escapeText(disclosure("OFFICIAL_USER"))+' 請勿輸入客戶個人資料。</p></div>':'')+(routeEntry==="user"&&previewUser?'<p id="user-status" role="status">'+escapeText(userError)+'</p><button id="exit-preview" class="secondary">返回編輯</button> <button id="save-preview" class="primary">儲存至本機</button>':'')+'<div class="actions ava-front__actions"><button class="primary ava-button ava-button--primary" id="next" '+(at===flow.length-1?"disabled":"")+'>下一步</button></div>';
function go(key){if(!validateCurrent())return;if(/^u-/.test(key)){customPageId=key}else{customPageId=null;state.step=Number(key)}render()}

document.querySelectorAll("[data-method]").forEach(b=>b.onclick=()=>{state.method=b.dataset.method;go("1")});
document.querySelectorAll("[data-goal]").forEach(b=>b.onclick=()=>{const i=+b.dataset.goal;state.goals=state.goals.includes(i)?state.goals.filter(x=>x!==i):[...state.goals,i];b.setAttribute("aria-pressed",state.goals.includes(i))});
document.querySelectorAll("[data-year]").forEach(b=>b.onclick=()=>{state.term=Number(b.dataset.year);state.bankYears=state.term;render();document.querySelector(`[data-year="${state.term}"]`)?.focus()});
document.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{state.plan=b.dataset.choice;render()});
$("#back").onclick=()=>{if(at>0)go(flow[at-1].key)};$("#next").onclick=()=>{if(at<flow.length-1)go(flow[at+1].key)};
async function saveUserDraft(){if(userSaving)return;userSaving=true;const snapshot=cloneUser(userDraft);try{await writeUserData(snapshot);userSaved=snapshot;userDirty=userChanged();userError=userDirty?"已儲存較早版本，較新的修改仍未儲存。":"已儲存並核對本機資料。"}catch(e){userError="儲存失敗，草稿仍保留；請重試。"}finally{userSaving=false}render()}
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
 window.addEventListener("beforeunload",e=>{if(userDirty){e.preventDefault();e.returnValue=""}});
 (async()=>{await refreshOfficial();try{const saved=await readUserData();if(saved!==undefined)userSaved=migrateUserData(saved);userDraft=cloneUser(userSaved);userReady=true}catch(e){userReady=false}render()})();
}

if(typeof window!=="undefined" && typeof navigator!=="undefined" && typeof document!=="undefined"){
 const network=()=>{const node=document.querySelector("#network-status");if(node)node.textContent=navigator.onLine?"網絡已連接":"離線模式：使用上次保存的程式及資料"};
 window.addEventListener("online",()=>{network();if(OFFICIAL_ENDPOINT)refreshOfficial().then(()=>{if(!userDirty)render()})});window.addEventListener("offline",()=>{network();if(OFFICIAL_ENDPOINT)refreshOfficial().then(()=>{if(!userDirty)render()})});network();
 if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost" || location.hostname==="127.0.0.1"))navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{const node=document.querySelector("#network-status");if(node)node.textContent="離線功能暫時不可用"});
}

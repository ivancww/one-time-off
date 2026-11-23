// AVA One-Time-Off: App-owned release/version notice and safe Shell refresh.
const APP_ID="one-time-off", CURRENT_VERSION="0.4.1";
const observedKey="ava:one-time-off:observed-release", attemptKey="ava:one-time-off:reload-attempt";
const manifestUrl=new URL("../app-release.json",import.meta.url);
const safeStore={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
export function compareReleaseVersions(a,b){
 const parse=v=>typeof v==="string"&&/^\d+\.\d+\.\d+$/.test(v)?v.split(".").map(Number):null;
 const aa=parse(a),bb=parse(b);if(!aa||!bb||[...aa,...bb].some(x=>!Number.isSafeInteger(x)))return null;
 for(let i=0;i<3;i++){if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1}return 0;
}
export function validRelease(m){
 return !!m && m.appId===APP_ID && m.published===true && typeof m.releaseId==="string"
 && m.releaseId===APP_ID+"@"+m.version && compareReleaseVersions(m.version,"0.0.0")!==null
 && typeof m.title==="string" && m.title.length<=120
 && typeof m.publishedAt==="string" && /^\d{4}-\d{2}-\d{2}$/.test(m.publishedAt)
 && Array.isArray(m.changes) && m.changes.length>0 && m.changes.length<=12
 && m.changes.every(c=>typeof c==="string"&&c.length>0&&c.length<=300)
 && Array.isArray(m.history) && m.history.length<=30 && m.history.every(h=>h&&typeof h.version==="string"&&compareReleaseVersions(h.version,"0.0.0")!==null&&typeof h.title==="string"&&Array.isArray(h.changes));
}
const $=id=>document.getElementById(id);
let remote=null,checking=false,activeModal=null;
const hasUnsavedChanges=()=>typeof window.__avaHasUnsavedDraft==="function"&&window.__avaHasUnsavedDraft();
function ensureDialog(){
 let d=$("ava-release-dialog");if(d)return d;
 d=document.createElement("dialog");d.id="ava-release-dialog";d.className="ava-release-dialog";
 d.setAttribute("aria-labelledby","ava-release-title");document.body.append(d);return d;
}
function closeDialog(){if(activeModal){activeModal.close();activeModal=null}}
function dialogContent({title,summary,changes,action,actionLabel,lock=false}){
 const d=ensureDialog();closeDialog();
 d.replaceChildren();const header=document.createElement("h2");header.id="ava-release-title";header.textContent=title;
 const p=document.createElement("p");p.className="release-summary";p.textContent=summary;
 const list=document.createElement("ul");for(const c of changes){const li=document.createElement("li");li.textContent=c;list.append(li)}
 const actions=document.createElement("div");actions.className="release-actions";
 const primary=document.createElement("button");primary.type="button";primary.textContent=actionLabel;primary.className="release-primary";primary.onclick=action;
 actions.append(primary);
 if(!lock){const close=document.createElement("button");close.type="button";close.textContent="關閉";close.onclick=closeDialog;actions.append(close)}
 d.append(header,p,list,actions);
 d.oncancel=e=>{if(lock)e.preventDefault();else{activeModal=null}};
 d.showModal();activeModal=d;primary.focus();return d;
}
function showHistory(){
 const m=remote;const versions=m?.history?.length?m.history:[{version:CURRENT_VERSION,title:"版本更新",changes:["詳情以已發布版本紀錄為準"]}];
 const changes=versions.flatMap(h=>[h.title+" · v"+h.version,...h.changes.map(c=>"　"+c)]).slice(0,70);
 dialogContent({title:"更新紀錄",summary:"One-Time-Off · 已發布版本",changes,action:closeDialog,actionLabel:"返回"});
}
function displayNotice(m,observed){
 const history=m.history.filter(x=>compareReleaseVersions(x.version,observed)===1).sort((a,b)=>compareReleaseVersions(b.version,a.version));
 const changes=(history.length?history.flatMap(x=>x.changes):m.changes).slice(0,12);
 dialogContent({title:"更新通知",summary:"One-Time-Off 已更新至 v"+m.version,changes,action:()=>{safeStore.set(observedKey,m.version);closeDialog()},actionLabel:"了解，開始使用"});
}
function updateBlocked(m,message=""){
 const comparison=compareReleaseVersions(m.version,CURRENT_VERSION);
 if(comparison!==1)return;
 const changes=m.changes;
 const summary=message||("目前使用 v"+CURRENT_VERSION+"，已有新版本 v"+m.version+"。需要更新後先繼續使用。");
 dialogContent({title:"必須更新",summary,changes,lock:true,action:()=>performUpdate(m),actionLabel:hasUnsavedChanges()?"儲存草稿並更新":"立即更新"});
}
async function performUpdate(m){
 if(hasUnsavedChanges()){
  const save=window.__avaSaveUserDraft;
  if(typeof save!=="function"){updateBlocked(m,"有未儲存的內容，請先保存草稿。");return}
  const saved=await save();
  if(!saved){updateBlocked(m,"儲存草稿未成功，未有重新載入。請檢查資料儲存後再試。");return}
 }
 safeStore.set(attemptKey,m.releaseId);
 try{
  if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update()}
  location.reload();
 }catch{safeStore.set(attemptKey,"");updateBlocked(m,"更新暫時未能完成。請確認網絡後重試。")}
}
async function checkRelease(){
 if(checking||navigator.onLine===false)return;checking=true;
 try{
  const response=await fetch(manifestUrl.href,{cache:"no-store",credentials:"same-origin",redirect:"error"});
  if(!response.ok||response.type==="opaque")return;
  const m=await response.json();if(!validRelease(m))return;remote=m;
  const cmp=compareReleaseVersions(m.version,CURRENT_VERSION);
  if(cmp===1){updateBlocked(m);return}
  if(cmp!==0)return;
  const observed=safeStore.get(observedKey);
  if(!observed||compareReleaseVersions(observed,CURRENT_VERSION)===null){safeStore.set(observedKey,CURRENT_VERSION);return}
  if(compareReleaseVersions(CURRENT_VERSION,observed)===1&&!activeModal)displayNotice(m,observed);
  if(safeStore.get(attemptKey)===m.releaseId)safeStore.set(attemptKey,"");
 }catch{}finally{checking=false}
}
if(typeof window!=="undefined"&&typeof document!=="undefined"){
 document.addEventListener("DOMContentLoaded",()=>{
  checkRelease();
  window.addEventListener("online",checkRelease);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkRelease()});
  window.addEventListener("pageshow",checkRelease);
 });
}

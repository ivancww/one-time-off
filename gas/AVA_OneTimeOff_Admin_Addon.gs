/**
 * AVA One-Time-Off Admin GAS additive module — REVIEW CANDIDATE ONLY.
 * Paste as a NEW .gs file into the EXISTING One-Time-Off Apps Script project.
 * Do not replace doGet/doPost. Invoke otoAdminDispatch_(body) only from existing doPost.
 * Requires Script Property: AVA_PLATFORM_GAS_URL. Optional: OTO_ADMIN_WRITES_ENABLED=true.
 * Existing public read actions, Sheets and financial calculations are unchanged.
 */
var OTO_ADMIN_APP_ID_ = 'one-time-off';
var OTO_ADMIN_SHEET_ID_ = '1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
var OTO_ADMIN_LAYOUT_ = Object.freeze({
  'officialContent': {name:'官方內容', id:'內容ID', field:'官方文字', fieldIndex:3, headers:['內容ID','頁面ID','類型','官方文字','備註']},
  'disclosures': {name:'重要提示', id:'提示ID', field:'內容', fieldIndex:3, headers:['提示ID','適用頁面','類型','內容','核實狀態']}
});
// Explicit separate admin-only dispatch names avoid collisions with existing read actions.
function otoAdminDispatch_(body) {
  body = body || {};
  var action=String(body.action||'');
  if (action==='otoAdminExchange') return otoAdminExchange_(body);
  if (action==='otoAdminRead') return otoAdminRead_(body);
  if (action==='otoAdminSaveText') return otoAdminSaveText_(body);
  throw new Error('Unsupported One-Time-Off Admin action');
}
function otoAdminPlatformRequest_(payload) {
  var url=PropertiesService.getScriptProperties().getProperty('AVA_PLATFORM_GAS_URL');
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) throw new Error('Admin verifier not configured');
  var resp=UrlFetchApp.fetch(url, {method:'post', contentType:'text/plain;charset=utf-8',payload:JSON.stringify(payload),followRedirects:true,muteHttpExceptions:true});
  if (resp.getResponseCode()!==200) throw new Error('Platform authorization unavailable');
  var result;
  try {result=JSON.parse(resp.getContentText());}catch(e){throw new Error('Platform authorization unavailable');}
  if (!result || result.success!==true || result.appId!==OTO_ADMIN_APP_ID_ || result.contract!=='ava-admin-session-v1') throw new Error('Platform authorization denied');
  if (!result.expiresAt || Date.parse(result.expiresAt)<=Date.now()) throw new Error('Admin authorization expired');
  return result;
}
function otoAdminExchange_(body) {
  if (body.appId!==OTO_ADMIN_APP_ID_) throw new Error('Invalid App ID');
  if (!/^[a-z0-9-]{8,100}$/i.test(String(body.launchTicket||'')) || !/^[a-z0-9-]{8,100}$/i.test(String(body.launchNonce||'')) || !/^[a-z0-9-]{8,100}$/i.test(String(body.browserProof||''))) throw new Error('Invalid launch context');
  var response=otoAdminPlatformRequest_({
    action:'exchangeAdminSession',appId:OTO_ADMIN_APP_ID_,launchTicket:body.launchTicket,
    launchNonce:body.launchNonce,browserProof:body.browserProof
  });
  if (!response.adminSessionProof) throw new Error('Admin exchange rejected');
  // The caller must keep this short-lived proof only in volatile memory, never URL/localStorage/backup.
  return {success:true,appId:OTO_ADMIN_APP_ID_,contract:'ava-admin-session-v1',
    adminSessionProof:response.adminSessionProof,expiresAt:response.expiresAt};
}
function otoAdminAuthorize_(body,operation) {
  if (body.appId!==OTO_ADMIN_APP_ID_ || typeof body.adminSessionProof!=='string' ||
      body.adminSessionProof.length<32 || body.adminSessionProof.length>4096) throw new Error('Admin authorization required');
  var response=otoAdminPlatformRequest_({action:'verifyAdminSession',appId:OTO_ADMIN_APP_ID_,
    adminSessionProof:body.adminSessionProof,operation:operation});
  if (response.operation!==operation) throw new Error('Admin operation denied');
}
function otoAdminSheet_(table) {
  var spec=OTO_ADMIN_LAYOUT_[table]; if (!spec) throw new Error('Unknown Official table');
  var book=SpreadsheetApp.openById(OTO_ADMIN_SHEET_ID_);
  var sh=book.getSheetByName(spec.name);if(!sh)throw new Error('Official sheet unavailable');
  var values=sh.getDataRange().getDisplayValues();
  if (!values.length || spec.headers.some(function(h,i){return values[0][i]!==h;})) throw new Error('Official sheet schema mismatch');
  var seen={};
  var rows=values.slice(1).filter(function(row){return row.some(function(cell){return cell!=='';});}).map(function(row){
    var id=String(row[0]||'');
    if (!id || Object.prototype.hasOwnProperty.call(seen,id)) throw new Error('Official record ID invalid or duplicated');
    seen[id]=true;return row.slice(0,spec.headers.length);
  });
  return {sheet:sh,spec:spec,rows:rows};
}
function otoAdminHash_(rows) {
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(rows),Utilities.Charset.UTF_8);
  return bytes.map(function(b){return (b+256).toString(16).slice(-2);}).join('');
}
function otoAdminRead_(body) {
  otoAdminAuthorize_(body,'official-read');
  var table=String(body.table||'');
  var d=otoAdminSheet_(table);
  return {success:true,appId:OTO_ADMIN_APP_ID_,table:table,revision:otoAdminHash_(d.rows),
    records:d.rows.map(function(row){return {id:row[0],text:row[d.spec.fieldIndex],fields:row};}),
    writable:PropertiesService.getScriptProperties().getProperty('OTO_ADMIN_WRITES_ENABLED')==='true'};
}
function otoAdminSaveText_(body) {
  otoAdminAuthorize_(body,'official-write');
  if (PropertiesService.getScriptProperties().getProperty('OTO_ADMIN_WRITES_ENABLED')!=='true') throw new Error('Official writes not enabled');
  var table=String(body.table||''),recordId=String(body.recordId||''),value=body.text,expected=String(body.expectedRevision||'');
  if (!/^[A-Za-z0-9_]{2,100}$/.test(recordId) || typeof value!=='string' || !value.trim() || value.length>2000 || /^\s*[=+@]/.test(value) || !/^[a-f0-9]{64}$/.test(expected))
    throw new Error('Invalid Official update');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    var d=otoAdminSheet_(table),revision=otoAdminHash_(d.rows);
    if (revision!==expected) throw new Error('Official revision conflict: reload before saving');
    var matches=d.rows.filter(function(row){return row[0]===recordId;});
    if (matches.length!==1) throw new Error('Official record not found');
    var grid=d.sheet.getDataRange().getDisplayValues(),rowIndex=-1;
    for(var i=1;i<grid.length;i++){if(grid[i][0]===recordId){if(rowIndex!==-1)throw new Error('Duplicated Official ID');rowIndex=i+1;}}
    if (rowIndex===-1) throw new Error('Official record not found');
    var oldValue=grid[rowIndex-1][d.spec.fieldIndex];
    try {
      d.sheet.getRange(rowIndex,d.spec.fieldIndex+1).setValue(value);
      SpreadsheetApp.flush();
      var after=otoAdminSheet_(table),saved=after.rows.filter(function(row){return row[0]===recordId;});
      if (saved.length!==1 || saved[0][d.spec.fieldIndex]!==value) throw new Error('Official read-back mismatch');
      return {success:true,appId:OTO_ADMIN_APP_ID_,table:table,recordId:recordId,
        text:saved[0][d.spec.fieldIndex],revision:otoAdminHash_(after.rows),persisted:true};
    } catch (error) {
      // Best-effort rollback. Deployment must independently verify the actual Sheet state after failure.
      try { d.sheet.getRange(rowIndex,d.spec.fieldIndex+1).setValue(oldValue); SpreadsheetApp.flush(); } catch (_) {}
      throw error;
    }
  }finally{lock.releaseLock();}
}
// Existing doPost(e) integration, preserving ALL current actions:
// var body=JSON.parse(e.postData.contents||'{}');
// if (['otoAdminExchange','otoAdminRead','otoAdminSaveText'].indexOf(body.action)>=0)
//   return existingJsonResponseFunction_(otoAdminDispatch_(body));
// Keep existing doGet, existing doPost actions and current deployed URL unchanged.

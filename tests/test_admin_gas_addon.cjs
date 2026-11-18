const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const src=fs.readFileSync('gas/AVA_OneTimeOff_Admin_Addon.gs','utf8');
const properties=new Map([['AVA_PLATFORM_GAS_URL','https://script.google.com/macros/s/test-deployment/exec']]);
let requests=[],writes=0,authorized=true;
const headers=['內容ID','頁面ID','類型','官方文字','備註'];
let grid=[headers,['P1_TITLE','P1','標題','原本標題','']];
const sheet={
  getDataRange(){return {getDisplayValues(){return grid.map(r=>r.slice())}}},
  getRange(row,col){return {setValue(value){writes++;grid[row-1][col-1]=value}}}
};
const contexts={
  PropertiesService:{getScriptProperties(){return {getProperty:k=>properties.get(k)||null}}},
  UrlFetchApp:{fetch(_url,options){const payload=JSON.parse(options.payload);requests.push(payload);
    const result=authorized?{success:true,appId:'one-time-off',contract:'ava-admin-session-v1',
      expiresAt:new Date(Date.now()+60000).toISOString(),
      operation:payload.operation,adminSessionProof:'a'.repeat(50)}:{success:false,error:'denied'};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(result)};
  }},
  SpreadsheetApp:{openById(id){assert.equal(id,'1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U');
    return {getSheetByName(name){return name==='官方內容'?sheet:null}}},flush(){}},
  Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'utf8'},
    computeDigest(_a,data){return [...crypto.createHash('sha256').update(data).digest()]}},
  LockService:{getScriptLock(){return {waitLock(){},releaseLock(){}}}}
};
const ctx=vm.createContext({...contexts,Date,JSON,Object});
vm.runInContext(src,ctx);
function deny(fn){assert.throws(fn)}
const valid={appId:'one-time-off',adminSessionProof:'p'.repeat(60),table:'officialContent'};
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminExchange',appId:'other'}));
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminRead',appId:'one-time-off',table:'officialContent'}));
authorized=false;deny(()=>ctx.otoAdminDispatch_({action:'otoAdminRead',...valid}));authorized=true;
const exchange=ctx.otoAdminDispatch_({action:'otoAdminExchange',appId:'one-time-off',launchTicket:'uuid-ticket-1234',launchNonce:'uuid-nonce-1234',browserProof:'uuid-proof-1234'});
assert.equal(exchange.contract,'ava-admin-session-v1');
const read=ctx.otoAdminDispatch_({action:'otoAdminRead',...valid});
assert.equal(read.records.length,1);assert.equal(read.records[0].text,'原本標題');
assert.equal(read.writable,false);
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'更新標題',expectedRevision:read.revision}));
assert.equal(writes,0);
properties.set('OTO_ADMIN_WRITES_ENABLED','true');
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'更新標題',expectedRevision:'a'.repeat(64)}));
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'=IMPORTXML("bad")',expectedRevision:read.revision}));
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'OTHER_ID',text:'更新標題',expectedRevision:read.revision}));
assert.equal(writes,0);
const saved=ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'更新標題',expectedRevision:read.revision});
assert.equal(saved.persisted,true);assert.equal(saved.text,'更新標題');assert.notEqual(saved.revision,read.revision);
assert.equal(grid[1][3],'更新標題');assert.equal(writes,1);
deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'第二次',expectedRevision:read.revision}));
assert.equal(writes,1);
authorized=false;deny(()=>ctx.otoAdminDispatch_({action:'otoAdminSaveText',...valid,recordId:'P1_TITLE',text:'非法修改',expectedRevision:saved.revision}));
assert.equal(writes,1);
assert(requests.some(x=>x.action==='exchangeAdminSession'));
assert(requests.some(x=>x.action==='verifyAdminSession'&&x.operation==='official-write'));
console.log('One-Time-Off additive GAS Admin: proof exchange, authorization, default read-only, safe text save, conflict and injection checks PASS (mocked).');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),vm=require('node:vm');
const snapshot=JSON.parse(readFileSync('data/official-snapshot.json','utf8'));
const source=readFileSync('gas/AVA_OneTimeOff_Returns_V2.gs','utf8');
const pages=new Map(snapshot.plans.map(p=>[p.sheet,[
 ['保單年度','每年提取百分比','結餘倍數'],
 ...p.balances.map(([year,factor])=>[year,p.rate,factor])
]]));
const context=vm.createContext({
 SpreadsheetApp:{openById(id){assert.equal(id,snapshot.sourceSpreadsheetId);return {getSheetByName(name){
  const values=pages.get(name);return values?{getDataRange(){return {getValues(){return values.map(r=>r.slice())}}}}:null;
 }}}},
 Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest(_x,s){return [...require('node:crypto').createHash('sha256').update(s).digest()]}}
});
vm.runInContext(source,context);
const result=context.otoReturnsPayload_();
assert.deepEqual(JSON.parse(JSON.stringify(result.plans)),snapshot.plans);
const hash=context.otoReturnsRevision_(result);
assert.match(hash,/^[0-9a-f]{64}$/);
assert.equal(hash,context.otoReturnsRevision_(result));
const altered=structuredClone(pages.get('7year 6.5%'));
altered[7][1]=0.06;pages.set('7year 6.5%',altered);
assert.throws(()=>context.otoReturnsPayload_(),/Official returns data invalid/);
pages.delete('7year 6.5%');
assert.throws(()=>context.otoReturnsPayload_(),/Missing expected Official tab/);
assert.doesNotMatch(source,/function\s+do(?:Get|Post)\s*\(/,'Addon must never shadow existing deployed GAS routing');
console.log('GAS Returns V2: five source tabs, read-only strict validation and stable revision PASS (mock).');

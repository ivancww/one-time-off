// Owner-provided JSON is an abbreviated schema example, not live GAS data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseGasBootstrap,parseGasVersion,parseGasContent,parseGasFinancial,createDocumentedGasReader} from '../server/gas-actions.mjs';
import {mapFinancial,mapContent,validateBootstrap} from '../server/gas-mappers.mjs';
const example=JSON.parse(await readFile(new URL('./fixtures/owner-gas-schema-examples.json',import.meta.url)));
const snap=JSON.parse(await readFile(new URL('../data/official-snapshot.json',import.meta.url)));
assert.equal(example.verificationStatus,'SCHEMA_EXAMPLE_NOT_LIVE_RESPONSE');
for(const [action,parser] of [['version',parseGasVersion],['financial',parseGasFinancial],['content',parseGasContent],['bootstrap',parseGasBootstrap]])assert(parser(example[action]));
// Examples are partial by design; they must never pass complete dataset checks.
assert.throws(()=>mapFinancial(example.financial.data));assert.throws(()=>mapContent(example.content.data));
for(const p of example.financial.data.plans){const actual=snap.plans.find(x=>x.id===p.id);assert(actual);assert.equal(p.sheet,actual.sheet);assert.equal(p.rate,actual.rate);for(const [year,value] of p.balances)assert.equal(actual.balances.find(row=>row[0]===year)?.[1],value)}
const completeContent={salesFlow:snap.content.pages.map(([pageId,order,title,visible,description])=>({pageId,order,title,visible:visible==='是',description})),content:snap.content.entries.map(([id,pageId,type,text,note=''])=>({id,pageId,type,text,note})),disclosures:snap.content.disclosures.map(([id,pageId,type,text,verificationStatus])=>({id,pageId,type,text,verificationStatus}))};
for(const [group,key] of [['salesFlow','pageId'],['content','id'],['disclosures','id']])for(const row of example.content.data[group])assert.deepEqual(row,completeContent[group].find(v=>v[key]===row[key]));
const all=structuredClone(example);all.financial.data.plans=structuredClone(snap.plans);all.content.data=completeContent;all.bootstrap.financial=structuredClone(all.financial);all.bootstrap.officialContent=structuredClone(all.content.data);
let calls=[];const reader=createDocumentedGasReader({getAction:async action=>{calls.push(action);return structuredClone(all[action])},mapFinancial,mapContent,validateBootstrap,now:()=>new Date('2026-11-16T00:00:00.000Z')});
const envelope=await reader();assert.deepEqual(calls.sort(),['bootstrap','content','financial','version','version']);assert.equal(envelope.data.plans.flatMap(p=>p.balances).length,172);assert.equal(envelope.data.content.pages.length,7);assert.equal(envelope.data.content.entries.length,23);assert.equal(envelope.data.content.disclosures.length,8);assert.equal(envelope.data.plans[0].balances.find(r=>r[0]===20)[1]*500000,693749.35415);
for(const [action,property,value] of [['version','service','other'],['bootstrap','apiVersion',2],['content','success',false],['financial','schemaVersion',2]]){const modified=structuredClone(all);modified[action][property]=value;const check=createDocumentedGasReader({getAction:async action=>modified[action],mapFinancial,mapContent,validateBootstrap});await assert.rejects(check())}
console.log('Owner schema examples and snapshot-expanded contract: PASS (not a live response)');

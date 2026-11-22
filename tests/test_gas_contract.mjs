// Synthetic test-only JSON shapes. These are not the deployed GAS contract.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGasContractReader,gasOfficialReadHandler} from '../server/gas-contract.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/official-snapshot.json',import.meta.url)));
const data=()=>({bootstrap:{mockBootstrap:{sourceSpreadsheetId:snapshot.sourceSpreadsheetId,pageIds:['P1','P2','P3','P4','P5','P6','P7']}},version:{mockVersion:{revision:'r1'}},content:{mockContent:structuredClone(snapshot.content)},financial:{mockFinancial:{sourceSpreadsheetId:snapshot.sourceSpreadsheetId,plans:structuredClone(snapshot.plans)}}});
const parsers=Object.fromEntries(['bootstrap','version','content','financial'].map(name=>[name,raw=>{const value=raw?.['mock'+name[0].toUpperCase()+name.slice(1)];if(!value)throw Error('unrecognized');return value}]));
let fixture=data(),calls=[];const getAction=async name=>{calls.push(name);return fixture[name]};
const create=()=>createGasContractReader({getAction,parsers,now:()=>new Date('2026-11-16T00:00:00Z')});
const result=await create()();assert.equal(result.revision,'r1');assert.deepEqual(calls.sort(),['bootstrap','content','financial','version','version']);assert.equal(result.data.plans.flatMap(p=>p.balances).length,172);assert.equal(result.data.content.entries.length,23);
for(const mutate of [v=>v.bootstrap.mockBootstrap.pageIds[0]='P0',v=>v.version.mockVersion.revision='',v=>v.content.mockContent.entries.pop(),v=>v.content.mockContent.disclosures.pop(),v=>v.financial.mockFinancial.plans[0].balances.pop(),v=>v.financial.mockFinancial.plans[0].rate=.3,v=>v.financial.mockFinancial.sourceSpreadsheetId='other']){fixture=data();mutate(fixture);await assert.rejects(create())}
fixture=data();let versionReads=0;await assert.rejects(createGasContractReader({parsers,getAction:async name=>name==='version'&&++versionReads===2?{mockVersion:{revision:'r2'}}:fixture[name]})());
assert.throws(()=>createGasContractReader({getAction}));assert.throws(()=>gasOfficialReadHandler({read:create()}));
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}});let res=response();await gasOfficialReadHandler({authorize:async()=>false,read:async()=>{throw Error('must not read')}})({method:'GET'},res);assert.equal(res.statusCode,403);
res=response();await gasOfficialReadHandler({authorize:async()=>true,read:async()=>{throw Error('sensitive')}})({method:'GET'},res);assert.equal(res.statusCode,503);assert(!res.body.includes('sensitive'));
res=response();fixture=data();await gasOfficialReadHandler({authorize:async()=>true,read:create()})({method:'GET'},res);assert.equal(res.statusCode,200);assert.equal(JSON.parse(res.body).revision,'r1');
console.log('Synthetic four-action contract boundary and fail-closed gateway: PASS');

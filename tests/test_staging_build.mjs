import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const tool='tools/create-staging.mjs',prod='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U',test='STAGING_TEST_ID_123456789012345';
assert.notEqual(spawnSync(process.execPath,[tool,prod]).status,0);
const dir=execFileSync(process.execPath,[tool,test],{encoding:'utf8'}).trim();
try{assert(dir.startsWith(tmpdir()+'/one-time-off-staging-'));for(const f of ['src/official-data.mjs','server/sheets-readonly.mjs','data/official-snapshot.json']){const s=await readFile(dir+'/'+f,'utf8');assert(s.includes(test));assert(!s.includes(prod))}const index=await readFile(dir+'/index.html','utf8');assert(index.includes('STAGING TEST ONLY'));assert(index.includes('content="/official"'))}finally{await rm(dir,{recursive:true,force:true})}
console.log('Isolated staging build identity and production guard: PASS');

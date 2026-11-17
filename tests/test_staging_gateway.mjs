import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import https from 'node:https';
import {startStagingGateway} from '../tools/staging-gateway.mjs';
const stage=execFileSync(process.execPath,['tools/create-staging.mjs','STAGING_TEST_ID_123456789012345'],{encoding:'utf8'}).trim(), certdir=await mkdtemp(join(tmpdir(),'ava-cert-'));
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(certdir,'key.pem'),'-out',join(certdir,'cert.pem'),'-subj','/CN=127.0.0.1','-days','1'],{stdio:'ignore'});
 const key=await readFile(join(certdir,'key.pem')),cert=await readFile(join(certdir,'cert.pem'));let called=0;
 const failFetch=async()=>{called++;return {ok:false}};
 const g=await startStagingGateway({directory:stage,key,cert,getAccessToken:async()=> 'test-token',fetcher:failFetch});
 const req=(path,cookie,host)=>new Promise((resolve,reject)=>{https.get(g.origin+path,{rejectUnauthorized:false,headers:{...(cookie?{cookie}:{}),...(host?{host}:{})}},r=>{let body='';r.on('data',x=>body+=x);r.on('end',()=>resolve({status:r.statusCode,body}))}).on('error',reject)});
 try{assert.equal((await req('/')).status,403);assert.equal((await req('/official')).status,403);assert.equal((await req('/',`staging_session=${'é'.repeat(64)}`)).status,403);assert.equal(called,0);assert.equal((await req('/',g.cookie,'example.test')).status,403);const home=await req('/',g.cookie);assert.equal(home.status,200);assert(home.body.includes('STAGING TEST ONLY'));assert.equal((await req('/official',g.cookie)).status,503);assert.equal(called,1);assert.equal((await req('/server/sheets-readonly.mjs',g.cookie)).status,404)}finally{await g.close()}
 await assert.rejects(()=>startStagingGateway({directory:process.cwd(),key,cert,getAccessToken:async()=> 'token'}));
 console.log('Local staging gateway isolation and auth: PASS (simulated source)');
}finally{await rm(stage,{recursive:true,force:true});await rm(certdir,{recursive:true,force:true})}

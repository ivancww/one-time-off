// Create an isolated local-only staging build. It never contacts or changes Sheets.
import {mkdtemp,cp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const production='1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U';
const staging=process.argv[2];
if(!staging||!/^[A-Za-z0-9_-]{20,128}$/.test(staging)||staging===production){console.error('Provide a distinct staging spreadsheet ID.');process.exit(2)}
const target=await mkdtemp(join(tmpdir(),'one-time-off-staging-'));
for(const name of ['index.html','styles.css','design-system','sw.js','manifest.webmanifest','icon.svg','src','data','server'])await cp(join(root,name),join(target,name),{recursive:true});
for(const name of ['src/official-data.mjs','server/sheets-readonly.mjs','data/official-snapshot.json']){const file=join(target,name),text=await readFile(file,'utf8');if(!text.includes(production))throw Error('Expected source identity missing');await writeFile(file,text.replaceAll(production,staging))}
const index=join(target,'index.html'),html=await readFile(index,'utf8');
if(!html.includes('name="official-data-endpoint" content=""'))throw Error('Endpoint marker missing');
await writeFile(index,html.replace('name="official-data-endpoint" content=""','name="official-data-endpoint" content="/official"').replace('<body class="ava-front">','<body class="ava-front"><div role="status" style="background:#7c2d12;color:white;padding:12px;text-align:center">STAGING TEST ONLY · 測試資料，不能作客戶展示</div>'));
console.log(target);

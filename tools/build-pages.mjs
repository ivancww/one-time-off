// Builds a static App-only artifact; does not configure Pages or deploy.
import {mkdir,readFile,writeFile,copyFile,realpath} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,process.argv[2]||'work/pages'),sha=process.argv[3];
if(!output.startsWith(resolve(root,'work')+'/')||!/^[0-9a-f]{40}$/.test(sha||''))throw Error('Use an output within work/ and a reviewed full commit SHA');
const assets=['index.html','styles.css','sw.js','manifest.webmanifest','icon.svg','src/main.js','src/official-data.mjs','data/official-snapshot.json'];
const html=await readFile(resolve(root,'index.html'),'utf8');
if(!html.includes('name="official-data-endpoint" content=""'))throw Error('Static release requires labelled snapshot mode; gateway approval is separate');
const manifest=JSON.parse(await readFile(resolve(root,'manifest.webmanifest'),'utf8'));
if(manifest.scope!=='./'||manifest.start_url!=='./?avaEntry=frontend')throw Error('Invalid relative PWA scope');
for(const file of ['index.html','styles.css','src/main.js','src/official-data.mjs','sw.js','manifest.webmanifest'])if(/localhost|127\.0\.0\.1|app\.example\.test/.test((await readFile(resolve(root,file),'utf8')).replace(/location\.hostname===\"localhost\" \|\| location\.hostname===\"127\.0\.0\.1\"/g,'')))throw Error('Unexpected test destination in static artifact');
await mkdir(dirname(output),{recursive:true});await mkdir(output);const hashes={};
for(const file of assets){const source=await realpath(resolve(root,file));if(!source.startsWith(root+'/'))throw Error('Invalid source asset');await mkdir(dirname(resolve(output,file)),{recursive:true});await copyFile(source,resolve(output,file));hashes[file]=createHash('sha256').update(await readFile(source)).digest('hex')}
await writeFile(resolve(output,'.nojekyll'),'');
await writeFile(resolve(output,'release.json'),JSON.stringify({appId:'one-time-off',sourceSha:sha,dataMode:'snapshot',assets:hashes},null,2)+'\n');
console.log(output);

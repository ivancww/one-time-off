// CI release governance: compare production-facing App changes with approved base.
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const files=["index.html","styles.css","sw.js","manifest.webmanifest","src/main.js","src/release-updates.mjs","src/official-data.mjs","app-release.json","tools/build-pages.mjs"];
const manifest=JSON.parse(readFileSync("app-release.json","utf8"));
const html=readFileSync("index.html","utf8"),source=readFileSync("src/release-updates.mjs","utf8");
const match=html.match(/id="app-version"[^>]*>v(\d+\.\d+\.\d+)/),runtime=source.match(/CURRENT_VERSION="(\d+\.\d+\.\d+)"/);
const parse=v=>typeof v==="string"&&/^\d+\.\d+\.\d+$/.test(v)?v.split(".").map(Number):null;
const gt=(a,b)=>{const aa=parse(a),bb=parse(b);if(!aa||!bb)throw Error("Invalid semantic version");for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i];return false};
if(!match||!runtime||match[1]!==manifest.version||runtime[1]!==manifest.version)throw Error("Visible version, release manifest and runtime version must match");
if(manifest.appId!=="one-time-off"||manifest.releaseId!=="one-time-off@"+manifest.version||manifest.published!==true||!Array.isArray(manifest.changes)||!manifest.changes.length||!Array.isArray(manifest.history)||manifest.history[0]?.version!==manifest.version)throw Error("Invalid released App manifest or history");
const base=process.env.BASE_SHA;
if(base){
 const changed=execFileSync("git",["diff","--name-only",base,"HEAD"],{encoding:"utf8"}).split("\n");
 if(changed.some(x=>files.includes(x))){
  let priorVersion;
  try{priorVersion=JSON.parse(execFileSync("git",["show",base+":app-release.json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]})).version}
  catch{const prior=execFileSync("git",["show",base+":index.html"],{encoding:"utf8"});priorVersion=prior.match(/id="app-version"[^>]*>v(\d+\.\d+\.\d+)/)?.[1]}
  if(!gt(manifest.version,priorVersion))throw Error("Production-facing App change without a greater version");
 }
}
console.log("App release/version manifest and semantic bump contract: PASS");

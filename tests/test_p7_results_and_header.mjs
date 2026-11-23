import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/main.js','utf8');
const html=readFileSync('index.html','utf8');
const updates=readFileSync('src/release-updates.mjs','utf8');
const data=JSON.parse(readFileSync('data/official-snapshot.json','utf8'));
const release=JSON.parse(readFileSync('app-release.json','utf8'));
assert.doesNotMatch(html, /id="release-history"/, 'Header History button must be removed');
assert.match(html, /id="return-ava"/, 'Return to AVA must remain');
assert.match(html, /src="\.\/src\/release-updates\.mjs"/, 'Automatic update checker must remain');
assert.match(updates, /function updateBlocked\(/, 'Mandatory updates must remain');
assert.match(updates, /function checkRelease\(/, 'Update checks must remain');
assert.match(source, /Number\.isInteger\(state\.currentAge\)\?/, 'Only show exact age when known');
assert.match(source, /"第 "\+Number\(year\)\+" 年"/, 'When missing age, use policy year instead of —歲');
assert.match(source, /請輸入目前歲數/, 'P7 must explain missing age');
assert.match(source, /inputCard\("currentAge","目前歲數",state\.currentAge\)/, 'P7 must offer direct age entry');
assert.match(source, /safeOutcome\(projectAt\(p,state\.withdrawalYear\)\)/, 'P7 must show existing source balance for each arrangement');
assert.doesNotMatch(source, /state\.plan==='rollover'\?projectAt\(p,state\.withdrawalYear\):null/, 'Source balances must not be suppressed');
assert.match(source, /每年可使用.*待核實/, 'Unknown annual payout must not be invented');
assert.match(source, /累積已使用.*待核實/, 'Unknown accumulated payout must not be invented');
assert.match(source, /實際提取基數及產品條款/, 'Explain why cash withdrawals are not calculated');

assert.match(source, /customerSummary\(\)/, 'A 5PAY-style customer summary is available after P7');
assert.match(source, /showSummary=true;render\(\)/, 'P7 Next must open summary instead of exiting');
assert.match(source, /id="back-to-p7"/, 'Summary must return to P7');
assert.match(source, /id="print-summary"/, 'Summary must offer a customer print/PDF action');
assert.match(source, /現有安排 ＋ 一次性儲蓄規劃/, 'Summary shows current arrangement and saving together');
assert.doesNotMatch(source, /at===flow\.length-1\?"disabled":""/, 'Final step must not render a disabled Next button');
assert.doesNotMatch(source, /else if\(validateCurrent\(\)\)returnLink\?\.click\(\)/, 'P7 must not exit to AVA before summary');
assert.match(source, /at<flow\.length-1\)go\(flow\[at\+1\]\.key\)/, 'Previous steps must retain Next navigation');

for (const p of data.plans){assert(p.balances.length>0);assert(p.balances.every(x=>Number.isFinite(x[1])&&x[1]>0))}
assert.equal(release.version,'0.3.3');assert.equal(release.releaseId,'one-time-off@0.3.3');
console.log('P7 policy-year fallback, sourced account balance, unverified cashflows and removed History button: PASS');

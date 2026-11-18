import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync("index.html","utf8");
const main=readFileSync("src/main.js","utf8");
const release=JSON.parse(readFileSync("app-release.json","utf8"));
const readiness=readFileSync("docs/admin-platform-readiness.md","utf8");
// Safety regression for the CURRENT, intentionally unsupported Admin capability.
// Remove/replace this gate only in a reviewed authenticated-Admin implementation PR,
// with backend authorization, negative tests and a separately approved Platform activation.
assert.match(main,/if\s*\(entry==="admin"\)\s*\{/,"Admin entry must have an explicit fail-closed guard");
assert.match(main,/官方資料管理尚未啟用/,"Do not silently route Admin to User Edit");
assert.match(main,/功能未開放/,"Admin route must show the unsupported state");
assert.match(main,/return;\s*\}/,"Admin unsupported branch must return before any Front/User rendering");
assert.match(html,/<meta name="official-data-endpoint" content="">/,"Do not silently enable unaudited Official data feed");
assert.doesNotMatch(html,/\bava-admin-session-v1\b/,"HTML markup alone cannot assert an authenticated backend");
assert.match(readiness,/BLOCKED — implementation\/deployment prerequisites unverified/);
assert.match(readiness,/AVA_ADMIN_APP_IDS/);
assert.equal(release.appId,"one-time-off");
console.log("One-Time-Off Admin readiness: unsupported Admin fails closed; no live official-write claim: PASS");

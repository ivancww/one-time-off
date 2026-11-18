# One-Time-Off GAS + AVA Platform GAS — staged coordinated update

## Current status
- **Source prepared, not deployed.** One-Time-Off App Admin still fails closed; Platform registry still has `admin:false`.
- The deployed One-Time-Off GAS project/source, `doGet`/`doPost` implementation, immutable deployment version and live responses are not accessible through the available connectors. Never treat the candidate module as a safe full replacement.
- Official Sheet verified (read only): `1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U`, seven tabs: `1year 4%`, `3year 5%`, `5year 6%`, `自動滾存`, `銷售流程`, `官方內容`, `重要提示`.

## One-Time-Off GAS: new additive file
File: `gas/AVA_OneTimeOff_Admin_Addon.gs`

This is **an additive file**, not a `Code.gs` replacement. It declares no `doGet` or `doPost` and deliberately cannot activate on its own. It provides:
- `otoAdminExchange`: server-to-server `exchangeAdminSession` with a browser-bound one-time ticket/nonce/proof.
- `otoAdminRead`: server-authorized read for `officialContent` (`官方內容`) and `disclosures` (`重要提示`).
- `otoAdminSaveText`: server-authorized, **feature-flag-disabled by default**, restricted existing-ID column-D text save with header validation, stable IDs, revision conflict checks, lock and read-back. No financial dataset writes.
- Every Admin read and write calls the existing Platform `verifyAdminSession` backend action, with App ID `one-time-off` and exact operation.

### Integration into the **existing** One-Time-Off GAS script
1. Make a backup of the **entire deployed project**, record the current deployment ID and selected immutable version; inspect the full existing source and ensure exactly one effective `doGet` and `doPost`.
2. Add a **new** Script file containing `AVA_OneTimeOff_Admin_Addon.gs`; **do not overwrite** existing GAS `Code.gs` or public `bootstrap/version/content/financial` actions.
3. Inside the existing `doPost(e)` JSON body handler, **after existing parsing and before its unsupported-action fallback**, add:

```javascript
if (['otoAdminExchange','otoAdminRead','otoAdminSaveText'].includes(body.action)) {
  return EXISTING_JSON_RESPONSE_FUNCTION(otoAdminDispatch_(body));
}
```

Replace `EXISTING_JSON_RESPONSE_FUNCTION` with the **actual existing** helper after inspecting the current project. Keep the existing error handling. Do **not** create a second `doPost`.
4. Configure One-Time-Off Script Properties: `AVA_PLATFORM_GAS_URL` = the **verified currently deployed** AVA Platform GAS `/exec` endpoint; `OTO_ADMIN_WRITES_ENABLED` = `false` until production Official Read, authorization and rollback tests are approved.
5. Inspect and test local source, then deploy **new immutable version to the existing deployment ID** only with Owner approval. Do not replace the Web App URL.
6. Implement App-owned secure Admin browser handshake and UI in a separate version-bumped PR; current `?avaEntry=admin` intentionally remains disabled.

## Platform GAS
Existing `gas/Code.gs` already provides `issueAdminSession`, `requestAdminBrowserProof`, `exchangeAdminSession`, `verifyAdminSession` and centralized Admin login. **Do not duplicate/rewrite these endpoints.**

Platform PR #84 adds allowlist revalidation on browser-bound Session exchange and on every verification. The Platform `AVA_ADMIN_APP_IDS` property must **not** include `one-time-off` before independent App security/production tests pass; setting `admin:true` in Platform registry is the **last** stage, in a separate reviewed PR.

## Joint acceptance checklist
1. Obtain complete live App GAS code and immutable deployed version; inspect effective GET/POST and Script Properties by **name only**.
2. Static tests: One-Time-Off `tests/test_admin_gas_addon.cjs`, existing App tests, Platform `tests/ava-admin-auth-lifetime.test.js`, release gates.
3. Deployed negative authorization tests: no proof, wrong App, copied URL, expired/replayed ticket, revoked Admin session, removal of App from allowlist; **no writes** in these cases.
4. Authorized read from two content tabs, stable ID/column validation, hash revision; financial tabs remain read-only.
5. Only after Owner authorization, reversible Official text write with exact prior revision, persistence/read-after-write and rollback. User Edit data and financial calculations unchanged.
6. Real AVA Studio → App Admin browser-bound launch/return, iPad and HONOR V5 checks.
7. Separate approved App and Platform merges, GAS redeployments, and Platform capability activation.

**Do not paste candidate GAS into a live project or enable the write flag while any production gate remains BLOCKED.**

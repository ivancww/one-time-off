# One-Time-Off Returns V2 — Sheet / GAS / App coordinated migration

Status: **Sheet data updated, GitHub App/GAS candidate prepared; live deployed GAS NOT updated**.

## Official Google Sheet
https://docs.google.com/spreadsheets/d/1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U/edit

Visible financial tabs, in supported App order:
1. `5year 6%` — begin year 5, 6% of one-time capital annually.
2. `7year 6.5%` — begin year 7, 6.5%.
3. `9year 7%` — begin year 9, 7%.
4. `11year 8%` — begin year 11, 8%.
5. `自動滾存` — no withdrawals; original year 5+ multipliers preserved and years 1–4 added from common pre-withdrawal values in four illustrations.

Historical `1year 4%` and `3year 5%` are **hidden, not deleted**. Keep them available until the existing live GAS and App migrate; remove only after confirming no live consumer still depends on them.

All four new withdrawal tabs have exactly 36 numeric rows: years **1–20** and then **25,30,...,100**. For each row, Column B is **0 before** the scheduled start year, then the announced rate thereafter. Column C is the corresponding normal-case illustration's **cash-withdrawal-adjusted total surrender value divided by HK$300,001**, rounded to 10 decimals. Source: four owner-provided AIA 2026-11-22 illustration PDFs, pp. 19–21. Not a guarantee; includes non-guaranteed benefits. Do not substitute death benefits, premium levy or pessimistic/optimistic scenarios.

## Existing GAS deployment integration (REQUIRES WORK CLOUD BROWSER)
- One-Time-Off deployed GAS reportedly V1. Inspect its full current source, deployment, Script Properties names, read contracts and one effective `doGet`/`doPost`. Back up source and note immutable rollback version.
- Use `gas/AVA_OneTimeOff_Returns_V2.gs` as **new additive source file** in the same existing GAS project. It creates neither `doGet` nor `doPost` and performs NO writes to financial tabs.
- In the current `financial` action's existing handler, use the returned `otoReturnsPayload_()` as the plan payload after reconciling the actual deployed API response schema. The `bootstrap` and `version` actions MUST use the same financial content/revision. Do not replace current content or Admin routes or break other public GET/POST actions.
- Preserve `AVA_PLATFORM_GAS_URL`, `OTO_ADMIN_WRITES_ENABLED`, any deployment property values, and the existing Admin PR #12 code as applicable. The V2 financial reader is read-only independently of the Admin writes flag.
- Ensure `getDataRange().getValues()` produces all expected rows; validate IDs and exact rates, 0 before start, row order and strict source name, plus the preserved rollover data.
- Run `tests/test_gas_returns_v2.mjs` and existing regression tests, then live tests in the authorized Work browser. Do not claim live PASSED based on mock tests.
- Keep V1 production until owner-authorized deployment with a new immutable Apps Script version using the **same deployment ID/URL**. Verify live read-only GET and baseline Admin access only after deploying. Keep the rollback ready.

## App / Data implications
- New App source, bundled snapshot, authorized Sheets adapter, server GAS mappers and tests all use five plan IDs: `year5`, `year7`, `year9`, `year11`, `rollover`.
- Five plans = **172** exact year rows (4 × 36 + 28 rollover).
- Display annual income = input capital × announced rate from selected start year; cumulative income = yearly amount × count of start-year-inclusive policy years.
- Display surrender value = input capital × matching year multiplier from chosen plan, never interpolate.
- P7 age rail starts on chosen start year (5/7/9/11) and year 1 for rollover. When client enters current age, display current age + policy year.
- App still has an **empty same-origin Official endpoint** in its HTML; therefore publishing the App with a bundled snapshot does NOT establish real-time GAS/Google Sheets sync. A verified same-origin authenticated read gateway is needed separately. Admin PR #12 is independent.

## Rollout and owner verification
1. Review PR #13, then PR #14 v0.4.0 source and green CI.
2. Review and reconcile V2 GAS source in the existing live GAS editor; save source, no deploy by default.
3. Complete live GET validation and negative tests on an isolated testing copy. Owner can defer iPad/HONOR real-device acceptance.
4. With a separate release approval, deploy the existing GAS ID/version and merge/publish App; prove data parity before removing legacy hidden tabs.
5. If a step is blocked, leave production unchanged and record the exact blocker.

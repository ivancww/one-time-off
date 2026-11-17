# Official data contract — Phase 1

Source: https://docs.google.com/spreadsheets/d/1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U/edit

Four exact tab names: 1year 4%, 3year 5%, 5year 6%, 自動滾存.
Columns: 保單年度, 每年提取百分比, 結餘倍數.

An official remaining balance at year Y equals one-time contribution × exact balance multiplier for Y. Only published exact rows are supported. No interpolation, extrapolation, or assumption that balance multiplier is an annual growth rate.

The 1/3/5-year labels imply possible payout start times but are **not** verified product terms. Sheet alone does not verify payout base, annual withdrawal schedule, guarantees, total payout, premiums, taxes, charges, surrender limitations or plan eligibility. Keep cumulative withdrawals and annual withdrawals disabled until official terms are checked.

The current app uses an explicitly labeled **manual verified snapshot**, not live Google Sheets/GAS sync. Before production: implement server-side authenticated GAS/Sheets adapter, versioning and validation, safe caching, schema checks, and fallback. Do not publish Sheet edit credentials in the client.

The current Phase 1 UI is a sales-flow prototype, **not Mother Standard compliance sign-off**: Unified User Edit, proper IndexedDB persistence, frontend/user/admin entry boundary, approved official/live integration, PWA updates and comprehensive cross-device QA remain pending.

## Adapter foundation and customer-journey integration

`src/official-data.mjs` defines a fail-closed schema for a future authorized
same-origin HTTPS backend and a cache interface. Version 1 requires the original
spreadsheet identity, four exact ordered tabs and rates, ascending unique exact
policy years, finite positive multipliers, a revision and a non-future publication
time. A changed schema or rate requires an explicit reviewed migration. Failed
network/validation can use a previously validated cache, or the bundled manual
snapshot; cache and snapshot must be visibly identified as non-live when this
module is integrated. Publication time is not itself proof that the Sheet is
current. Authentication and response integrity depend on the authorized backend
and deployment; client validation and browser storage do not establish official
provenance. The adapter is wired to startup with a separate IndexedDB cache interface; the UI currently uses only the labeled snapshot. No live endpoint is configured or contacted.

Approved endpoint, source authenticity, live and cached user-facing states, security tests and browser/offline tests remain outstanding. Current endpoint-disabled startup does not exercise the persistent cache.

The adapter marks a live or cached envelope older than seven days with a prompt
to verify it. This is an app warning threshold, not a verified product update
schedule, expiry date, or proof that newer data exists. Snapshot freshness is
unknown. Endpoint activation still requires an approved authenticated backend;
local cache and client schema checks alone cannot establish provenance.

## Deployment configuration

`index.html` has an empty `official-data-endpoint` meta value. A deployment can set it to an authorized same-origin HTTPS endpoint returning the adapter's version 1 envelope. Startup then attempts a read and validates and caches the response; failures use a validated cache or the bundled snapshot and are labelled. No backend is supplied or configured here, and this setting does not establish source authenticity. No live sync has been verified. The four snapshot tables were compared with Sheet A1:C100 on 2026-11-11 (Hong Kong time).

## Unresolved cash-flow rules: Owner verification

The Sheet's column says “annual withdrawal percentage”, but it does not establish the commencement date/year, whether the percentage applies to original contribution, opening balance or another base, the payment frequency within a year, timing relative to the valuation date, or treatment of partial years and prior withdrawals. The 5Pay strategy terms and five-year base are for another product and are not evidence for these rules. No other One-Time-Off product terms were found in the available repository and Drive search.

For illustration of the missing rule only: with HK$500,000, tab `1year 4%`, and its published year-5 multiplier 0.79327, the supported remaining balance is HK$396,635. If 4% were applied to the original HK$500,000, a hypothetical amount would be HK$20,000; if applied to HK$396,635, it would be HK$15,865.40. Neither is an official withdrawal calculation, and the latter balance is not established as the correct payment base. Please verify the start, base, frequency and timing with product documentation before enabling amounts or cumulative totals. Do not subtract either hypothetical figure from the published balance.

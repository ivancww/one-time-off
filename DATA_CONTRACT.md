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

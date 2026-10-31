# Official data contract — Phase 1

Source: https://docs.google.com/spreadsheets/d/1-QG1tnH0iTYLAzweJ6Gvj5JDN5p1YKIq9IONyvVIo4U/edit

Four exact tab names: 1year 4%, 3year 5%, 5year 6%, 自動滾存.
Columns: 保單年度, 每年提取百分比, 結餘倍數.

An official remaining balance at year Y equals one-time contribution × exact balance multiplier for Y. Only published exact rows are supported. No interpolation, extrapolation, or assumption that balance multiplier is an annual growth rate.

The 1/3/5-year labels imply possible payout start times but are **not** verified product terms. Sheet alone does not verify payout base, annual withdrawal schedule, guarantees, total payout, premiums, taxes, charges, surrender limitations or plan eligibility. Keep cumulative withdrawals and annual withdrawals disabled until official terms are checked.

The current app uses an explicitly labeled **manual verified snapshot**, not live Google Sheets/GAS sync. Before production: implement server-side authenticated GAS/Sheets adapter, versioning and validation, safe caching, schema checks, and fallback. Do not publish Sheet edit credentials in the client.

The current Phase 1 UI is a sales-flow prototype, **not Mother Standard compliance sign-off**: Unified User Edit, proper IndexedDB persistence, frontend/user/admin entry boundary, approved official/live integration, PWA updates and comprehensive cross-device QA remain pending.
